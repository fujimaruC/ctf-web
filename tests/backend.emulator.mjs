import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  initializeApp as adminApp,
  deleteApp as deleteAdmin,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth as adminAuth } from "firebase-admin/auth";
import { Timestamp } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  signInWithEmailAndPassword,
} from "firebase/auth";
import academy from "../netlify/lib/netlify/functions/academy.js";
import { resetAdminForTests } from "../netlify/lib/netlify/functions/admin.js";

test("Netlify API auth, scoring races, idempotency, roles, suspension, and paginated repair", async () => {
  assert.ok(
    process.env.FIRESTORE_EMULATOR_HOST &&
      process.env.FIREBASE_AUTH_EMULATOR_HOST,
    "Emulators are mandatory",
  );
  const admin = adminApp({ projectId: "demo-flagforge" }, "tests"),
    db = getFirestore(admin),
    accounts = adminAuth(admin),
    apps = [];
  try {
    const anonymous = await academy(new Request("http://localhost/api/academy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "submitFlag", data: {} }),
    }));
    assert.equal(anonymous.status, 401);
    await db.recursiveDelete(db.collection("users"));
    await db.recursiveDelete(db.collection("solves"));
    await db.recursiveDelete(db.collection("attempts"));
    await db.recursiveDelete(db.collection("players"));
    await db.recursiveDelete(db.collection("usernames"));
    await db.doc("meta/control").set({ maintenance: false });
    const clients = {};
    for (const uid of ["alice", "bob", "instructor"]) {
      try {
        await accounts.deleteUser(uid);
      } catch {}
      await accounts.createUser({
        uid,
        email: `${uid}@example.test`,
        password: "ExamplePass123!",
      });
      const app = initializeApp(
        {
          projectId: "demo-flagforge",
          apiKey: "demo-key",
          authDomain: "localhost",
        },
        uid,
      );
      apps.push(app);
      const auth = getAuth(app);
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      await signInWithEmailAndPassword(
        auth,
        `${uid}@example.test`,
        "ExamplePass123!",
      );
      clients[uid] = async (action, data = {}) => {
        const token = await auth.currentUser.getIdToken();
        const response = await academy(new Request("http://localhost/api/academy", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ action, data }),
        }));
        const body = await response.json();
        if (!response.ok)
          throw Object.assign(new Error(body.error.message), { code: `academy/${body.error.code}` });
        return body.data;
      };
      await clients[uid]("saveProfile", { displayName: uid, username: uid });
    }
    await db.doc("users/instructor").update({ role: "admin" });
    await assert.rejects(
      clients.alice("reconcile"),
      (e) => e.code === "academy/permission-denied",
    );
    const challenge = {
      title: "Test boundary",
      description: "An exercise for server-side verification.",
      category: "Web",
      difficulty: "Easy",
      points: 100,
      authorName: "Instructor",
      published: true,
      caseInsensitive: false,
      files: [],
      hints: [],
      flag: "FLAG{server}",
    };
    const { id } = await clients.instructor("adminChallenge", {
      action: "save",
      challenge,
    });
    assert.equal(
      (await db.doc(`challenges/${id}`).get()).get("flag"),
      undefined,
    );
    await assert.rejects(
      clients.alice("adminChallenge", { action: "delete", id }),
      (e) => e.code === "academy/permission-denied",
    );
    const race = await Promise.all(
      ["alice", "bob"].map((uid) =>
        clients[uid]("submitFlag", {
          challengeId: id,
          flag: "FLAG{server}",
          requestId: `race-${uid}`,
          points: 90000,
          uid: "instructor",
        }),
      ),
    );
    assert.equal(race.filter((r) => r.firstBlood).length, 1);
    for (const uid of ["alice", "bob"]) {
      assert.equal((await db.doc(`users/${uid}`).get()).get("points"), 100);
      const repeated = await clients[uid]("submitFlag", {
        challengeId: id,
        flag: "FLAG{server}",
        requestId: `race-${uid}`,
      });
      assert.equal(repeated.points, 100);
      const solved = await clients[uid]("submitFlag", {
        challengeId: id,
        flag: "FLAG{server}",
        requestId: `repeat-${uid}`,
      });
      assert.equal(solved.outcome, "alreadySolved");
      assert.equal(
        (await db.doc(`attempts/${uid}_${id}`).get()).get("count"),
        1,
      );
    }
    assert.equal((await db.doc(`challenges/${id}`).get()).get("solveCount"), 2);
    const { id: second } = await clients.instructor("adminChallenge", {
      action: "save",
      challenge: { ...challenge, caseInsensitive: true },
    });
    const duplicate = await Promise.all(
      Array.from({ length: 4 }, () =>
        clients.alice("submitFlag", {
          challengeId: second,
          flag: "wrong",
          requestId: "same-wrong",
        }),
      ),
    );
    assert.ok(duplicate.every((r) => r.attempts === 1));
    for (let i = 1; i < 10; i++)
      await clients.alice("submitFlag", {
        challengeId: second,
        flag: "wrong",
        requestId: `wrong-${i}`,
      });
    await assert.rejects(
      clients.alice("submitFlag", {
        challengeId: second,
        flag: "FLAG{server}",
        requestId: "limited",
      }),
      (e) => e.code === "academy/resource-exhausted",
    );
    const insensitive = await clients.bob("submitFlag", {
      challengeId: second,
      flag: " flag{SERVER} ",
      requestId: "insensitive",
    });
    assert.equal(insensitive.outcome, "correct");
    await assert.rejects(
      clients.bob("saveProfile", { displayName: "Bob", username: "alice" }),
      (e) => e.code === "academy/already-exists",
    );
    await clients.bob("saveProfile", {
      displayName: "Bob renamed",
      username: "bob_new",
    });
    assert.equal((await db.doc("usernames/bob").get()).exists, false);
    await clients.instructor("adminAccount", {
      uid: "alice",
      action: "suspend",
    });
    await assert.rejects(
      clients.alice("getLeaderboard"),
      (e) =>
        e.code === "academy/permission-denied" ||
        e.code === "academy/unauthenticated",
    );
    assert.equal((await db.doc("users/alice").get()).get("points"), 100);
    await clients.instructor("adminAccount", {
      uid: "alice",
      action: "reinstate",
    });
    await clients.instructor("adminAccount", {
      uid: "bob",
      action: "role",
      role: "admin",
    });
    await clients.instructor("adminAccount", {
      uid: "bob",
      action: "role",
      role: "admin",
    });
    assert.equal((await db.doc("users/bob").get()).get("role"), "admin");
    await clients.instructor("adminAccount", {
      uid: "bob",
      action: "role",
      role: "student",
    });
    await assert.rejects(
      clients.instructor("adminAccount", {
        uid: "instructor",
        action: "suspend",
      }),
    );
    await clients.instructor("maintenance", { enabled: true });
    await assert.rejects(
      clients.bob("submitFlag", {
        challengeId: id,
        flag: "FLAG{server}",
        requestId: "maintenance",
      }),
      (e) => e.code === "academy/unavailable",
    );
    await db.doc("users/bob").update({ points: 999 });
    const extras = db.batch();
    for (let index = 0; index < 55; index++)
      extras.set(db.doc(`solves/reconcile_${index}`), {
        uid: "bob", challengeId: second, challengeName: "Test boundary", category: "Web",
        difficulty: "Easy", points: 0, playerName: "bob", solvedAt: Timestamp.fromMillis(2_000 + index), isFirstBlood: false,
      });
    await extras.commit();
    let plan = await clients.instructor("reconcile");
    assert.equal(plan.phase, "scan");
    await assert.rejects(
      clients.instructor("reconcile", { token: "bad-token" }),
      (e) => e.code === "academy/invalid-argument",
    );
    while (plan.phase === "scan") plan = await clients.instructor("reconcile", { token: plan.continuation });
    assert.equal(plan.phase, "ready");
    assert.ok(plan.writes >= 0);
    await assert.rejects(
      clients.instructor("reconcile", { apply: true, digest: "wrong", token: plan.continuation }),
      (e) => e.code === "academy/failed-precondition",
    );
    let result = await clients.instructor("reconcile", {
      apply: true,
      digest: plan.digest,
      token: plan.continuation,
    });
    const retry = await clients.instructor("reconcile", { apply: true, digest: plan.digest, token: plan.continuation });
    assert.equal(retry.continuation, result.continuation);
    while (result.hasMore)
      result = await clients.instructor("reconcile", { apply: true, digest: plan.digest, token: result.continuation });
    assert.equal(result.applied, true);
    assert.equal((await db.doc("users/bob").get()).get("points"), 200);
    assert.equal((await db.doc("users/bob").get()).get("solves"), 57);
    assert.equal((await db.doc(`challenges/${second}`).get()).get("solveCount"), 56);
    assert.equal(
      (await db.doc("users/alice").get()).get("firstBloods") +
        (await db.doc("users/bob").get()).get("firstBloods"),
      2,
    );
    await clients.instructor("maintenance", { enabled: false });
    const board = await clients.bob("getLeaderboard");
    assert.equal(board.me.rank, 1);
    assert.ok(board.players.every((p) => !("email" in p) && !("role" in p)));
    await clients.instructor("adminChallenge", { action: "delete", id });
    assert.ok((await db.doc(`solves/alice_${id}`).get()).exists);
    await assert.rejects(
      clients.bob("submitFlag", {
        challengeId: id,
        flag: "FLAG{server}",
        requestId: "removed",
      }),
      (e) => e.code === "academy/not-found",
    );
    // Rehearse the real migration against legacy public flags and existing awards.
    await clients.instructor("maintenance", { enabled: true });
    await db
      .doc(`challenges/${second}`)
      .update({ flag: "FLAG{legacy}", caseInsensitive: true });
    await db.doc(`challengeSecrets/${second}`).delete();
    const run = promisify(execFile);
    const migrate = (...args) =>
      run(
        process.execPath,
        ["scripts/migrate.mjs", "--project=demo-flagforge", ...args],
        { timeout: 60000 },
      );
    const dry = await migrate();
    assert.ok(!dry.stdout.includes("FLAG{"));
    const report = JSON.parse(dry.stdout);
    assert.deepEqual(report.issues, []);
    await assert.rejects(
      migrate("--apply", "--confirm-project=demo-flagforge", "--digest=stale"),
    );
    const applied = await migrate(
      "--apply",
      "--confirm-project=demo-flagforge",
      `--digest=${report.digest}`,
    );
    assert.ok(!applied.stdout.includes("FLAG{"));
    assert.equal(
      (await db.doc(`challenges/${second}`).get()).get("flag"),
      undefined,
    );
    assert.equal(
      (await db.doc(`challengeSecrets/${second}`).get()).get("flag"),
      "FLAG{legacy}",
    );
    assert.equal((await db.doc("users/bob").get()).get("points"), 200);
    assert.equal((await db.doc("meta/control").get()).get("maintenance"), true);
    assert.deepEqual(JSON.parse((await migrate()).stdout).issues, []);
  } finally {
    await resetAdminForTests();
    for (const app of apps) await deleteApp(app);
    await deleteAdmin(admin);
  }
});
