import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import {
  FieldValue,
  getFirestore,
  Transaction,
} from "firebase-admin/firestore";
import {
  onCall,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2";
import { createHash } from "node:crypto";
import {
  challengeInput,
  comparePlayers,
  flagMatches,
  text,
  username,
} from "./domain.js";
initializeApp();
setGlobalOptions({
  region: process.env.FUNCTIONS_REGION || "us-central1",
  maxInstances: 10,
});
const db = getFirestore(),
  auth = getAuth(),
  control = db.doc("meta/control");
const stamp = () => FieldValue.serverTimestamp();
function uidOf(r: CallableRequest) {
  if (!r.auth) throw new HttpsError("unauthenticated", "Sign in to continue.");
  return r.auth.uid;
}
function id(v: unknown) {
  const s = parsed(() => text(v, "ID", 160));
  if (!/^[A-Za-z0-9_-]+$/.test(s))
    throw new HttpsError("invalid-argument", "Invalid ID.");
  return s;
}
function parsed<T>(fn: () => T): T {
  try {
    return fn();
  } catch (e) {
    throw new HttpsError(
      "invalid-argument",
      e instanceof Error ? e.message : "Check your input.",
    );
  }
}
async function access(
  uid: string,
  admin = false,
  t?: Transaction,
  allowMaintenance = false,
) {
  const read = (path: string) => (t ? t.get(db.doc(path)) : db.doc(path).get());
  const [u, state] = await Promise.all([
    read(`users/${uid}`),
    read("meta/control"),
  ]);
  if (!u.exists)
    throw new HttpsError("failed-precondition", "Complete your profile first.");
  if (u.get("suspended") === true)
    throw new HttpsError(
      "permission-denied",
      "Your academy access is suspended.",
    );
  if (admin && u.get("role") !== "admin")
    throw new HttpsError(
      "permission-denied",
      "Administrator access is required.",
    );
  if (state.get("maintenance") && !allowMaintenance)
    throw new HttpsError(
      "unavailable",
      "The academy is undergoing maintenance. Please try again later.",
    );
  return u.data()!;
}
function audit(t: Transaction, uid: string, action: string, target: string) {
  t.set(db.collection("audit").doc(), { uid, action, target, at: stamp() });
}
function player(uid: string, p: Record<string, any>) {
  return {
    uid,
    displayName: p.displayName,
    username: p.username,
    points: p.points || 0,
    solves: p.solves || 0,
    firstBloods: p.firstBloods || 0,
  };
}

export const saveProfile = onCall(async (r) => {
  const uid = uidOf(r),
    name = parsed(() => text(r.data?.displayName, "Display name", 100, 2)),
    handle = parsed(() => username(r.data?.username));
  const identity = await auth.getUser(uid);
  if (identity.disabled)
    throw new HttpsError("permission-denied", "Your account is suspended.");
  return db.runTransaction(async (t) => {
    const ref = db.doc(`users/${uid}`);
    const [existing, slot, state] = await Promise.all([
      t.get(ref),
      t.get(db.doc(`usernames/${handle}`)),
      t.get(control),
    ]);
    if (state.get("maintenance"))
      throw new HttpsError(
        "unavailable",
        "The academy is undergoing maintenance.",
      );
    if (existing.get("suspended"))
      throw new HttpsError("permission-denied", "Your account is suspended.");
    if (slot.exists && slot.get("uid") !== uid)
      throw new HttpsError(
        "already-exists",
        "That username is taken. Choose another.",
      );
    const old = existing.data(),
      oldHandle = old?.username?.toLowerCase();
    const oldSlot =
      oldHandle && oldHandle !== handle
        ? await t.get(db.doc(`usernames/${oldHandle}`))
        : null;
    const p = {
      ...(old || {
        uid,
        role: "student",
        points: 0,
        solves: 0,
        firstBloods: 0,
        createdAt: stamp(),
        suspended: false,
      }),
      displayName: name,
      username: handle,
      email: identity.email || "",
      avatar: old?.avatar || null,
    };
    t.set(ref, p);
    t.set(db.doc(`usernames/${handle}`), { uid });
    if (oldSlot?.get("uid") === uid) t.delete(oldSlot.ref);
    t.set(db.doc(`players/${uid}`), player(uid, p));
    return player(uid, p);
  });
});

export const submitFlag = onCall(async (r) => {
  const uid = uidOf(r),
    challengeId = id(r.data?.challengeId),
    requestId = id(r.data?.requestId),
    flag = parsed(() => text(r.data?.flag, "Flag", 2048));
  return db.runTransaction(async (t) => {
    const p = await access(uid, false, t);
    const chRef = db.doc(`challenges/${challengeId}`),
      solveRef = db.doc(`solves/${uid}_${challengeId}`),
      attemptRef = db.doc(`attempts/${uid}_${challengeId}`),
      requestRef = db.doc(`users/${uid}/requests/${requestId}`);
    const [ch, secret, solve, attempt, prior] = await Promise.all([
      t.get(chRef),
      t.get(db.doc(`challengeSecrets/${challengeId}`)),
      t.get(solveRef),
      t.get(attemptRef),
      t.get(requestRef),
    ]);
    if (!ch.exists || !ch.get("published") || !secret.exists)
      throw new HttpsError("not-found", "This challenge is unavailable.");
    if (prior.exists) {
      if (prior.get("challengeId") !== challengeId)
        throw new HttpsError("invalid-argument", "Use a new request ID.");
      return prior.get("result");
    }
    if (solve.exists)
      return {
        outcome: "alreadySolved",
        attempts: attempt.get("count") || 0,
        points: solve.get("points"),
        firstBlood: solve.get("isFirstBlood"),
      };
    const now = Date.now(),
      times: number[] = (attempt.get("recent") || []).filter(
        (n: number) => n > now - 300000,
      );
    if (times.length >= 10)
      throw new HttpsError(
        "resource-exhausted",
        "Attempt limit reached. Try again in five minutes.",
      );
    const count = (attempt.get("count") || 0) + 1,
      correct = flagMatches(
        flag,
        secret.get("flag"),
        secret.get("caseInsensitive"),
      );
    const firstBlood =
        correct && !(ch.get("solveCount") || 0) && !ch.get("firstBloodUid"),
      points = correct ? ch.get("points") : 0;
    const result = {
      outcome: correct ? "correct" : "incorrect",
      attempts: count,
      points,
      firstBlood,
    };
    t.set(attemptRef, { uid, challengeId, count, recent: [...times, now] });
    t.set(requestRef, { challengeId, result, at: stamp() });
    if (correct) {
      t.set(solveRef, {
        uid,
        challengeId,
        challengeName: ch.get("title"),
        category: ch.get("category"),
        difficulty: ch.get("difficulty"),
        playerName: p.displayName,
        points,
        solvedAt: stamp(),
        isFirstBlood: firstBlood,
      });
      t.update(chRef, {
        solveCount: (ch.get("solveCount") || 0) + 1,
        ...(firstBlood
          ? {
              firstBloodUid: uid,
              firstBloodName: p.displayName,
              firstBloodTimestamp: stamp(),
            }
          : {}),
      });
      const next = {
        ...p,
        points: (p.points || 0) + points,
        solves: (p.solves || 0) + 1,
        firstBloods: (p.firstBloods || 0) + Number(firstBlood),
      };
      t.update(db.doc(`users/${uid}`), {
        points: next.points,
        solves: next.solves,
        firstBloods: next.firstBloods,
      });
      t.set(db.doc(`players/${uid}`), player(uid, next));
    }
    return result;
  });
});
export const getLeaderboard = onCall(async (r) => {
  const uid = uidOf(r);
  await access(uid);
  // ponytail: bounded 2,000-account ranking; replace with indexed ranking before growth.
  const docs = await db.collection("players").limit(2001).get();
  if (docs.size > 2000)
    throw new HttpsError(
      "resource-exhausted",
      "Ranking capacity needs an administrator review.",
    );
  const sorted = docs.docs
    .map((d) => ({ ...d.data(), uid: d.id }))
    .sort(comparePlayers)
    .map((p, i) => ({ ...p, rank: i + 1 }));
  return {
    players: sorted.slice(0, 50),
    me: sorted.find((p) => p.uid === uid) || null,
  };
});
export const publicStats = onCall(async () => {
  const [ch, people, solves, settings] = await Promise.all([
    db.collection("challenges").where("published", "==", true).count().get(),
    db.collection("players").count().get(),
    db.collection("solves").count().get(),
    db.doc("meta/settings").get(),
  ]);
  return {
    challenges: ch.data().count,
    players: people.data().count,
    solves: solves.data().count,
    events: settings.get("events") || 0,
  };
});
export const adminChallenge = onCall(async (r) => {
  const uid = uidOf(r);
  await access(uid, true);
  const action = r.data?.action,
    ref = r.data?.id
      ? db.doc(`challenges/${id(r.data.id)}`)
      : db.collection("challenges").doc();
  if (action === "read") {
    const [ch, secret] = await Promise.all([
      ref.get(),
      db.doc(`challengeSecrets/${ref.id}`).get(),
    ]);
    if (!ch.exists) throw new HttpsError("not-found", "Challenge not found.");
    return {
      ...ch.data(),
      id: ref.id,
      flag: secret.get("flag") || "",
      caseInsensitive: secret.get("caseInsensitive") || false,
    };
  }
  const content =
      action === "save" ? parsed(() => challengeInput(r.data.challenge)) : null,
    flag = content
      ? parsed(() => text(r.data.challenge.flag, "Flag", 2048))
      : "";
  await db.runTransaction(async (t) => {
    await access(uid, true, t);
    const old = await t.get(ref);
    if (action === "delete") {
      if (!old.exists)
        throw new HttpsError("not-found", "Challenge already removed.");
      t.delete(ref);
      t.delete(db.doc(`challengeSecrets/${ref.id}`));
    } else if (action === "publish") {
      if (!old.exists || typeof r.data.published !== "boolean")
        throw new HttpsError("invalid-argument", "Invalid publication update.");
      t.update(ref, { published: r.data.published, updatedAt: stamp() });
    } else if (content) {
      t.set(ref, {
        ...(old.exists
          ? old.data()
          : { createdAt: stamp(), solveCount: 0, firstBloodUid: null }),
        ...content,
        updatedAt: stamp(),
      });
      t.set(db.doc(`challengeSecrets/${ref.id}`), {
        flag,
        caseInsensitive: r.data.challenge.caseInsensitive,
      });
    } else
      throw new HttpsError("invalid-argument", "Unknown challenge operation.");
    audit(t, uid, `challenge.${action}`, ref.id);
  });
  return { id: ref.id };
});
export const adminAccount = onCall(async (r) => {
  const uid = uidOf(r),
    target = id(r.data?.uid),
    action = r.data?.action;
  if (action === "role" && !["admin", "student"].includes(r.data?.role))
    throw new HttpsError("invalid-argument", "Choose the desired role.");
  if (!["role", "suspend", "reinstate"].includes(action))
    throw new HttpsError("invalid-argument", "Unknown account action.");
  if (target === uid)
    throw new HttpsError(
      "failed-precondition",
      "Ask another administrator to change your access.",
    );
  await db.runTransaction(async (t) => {
    await access(uid, true, t);
    const ref = db.doc(`users/${target}`),
      user = await t.get(ref),
      admins = await t.get(db.collection("users").where("role", "==", "admin"));
    if (!user.exists) throw new HttpsError("not-found", "Account not found.");
    if (
      user.get("role") === "admin" &&
      !user.get("suspended") &&
      (action === "suspend" ||
        (action === "role" && r.data.role === "student")) &&
      admins.docs.filter((d) => !d.get("suspended")).length <= 1
    )
      throw new HttpsError(
        "failed-precondition",
        "Keep at least one active administrator.",
      );
    t.update(
      ref,
      action === "role"
        ? { role: r.data.role }
        : { suspended: action === "suspend" },
    );
    audit(t, uid, `account.${action}`, target);
  });
  // Firestore immediately denies access even if Auth needs a retry.
  if (action !== "role") {
    await auth.updateUser(target, { disabled: action === "suspend" });
    if (action === "suspend") await auth.revokeRefreshTokens(target);
  }
  return { ok: true };
});
export const adminSettings = onCall(async (r) => {
  const uid = uidOf(r),
    platformName = parsed(() =>
      text(r.data?.platformName, "Platform name", 80),
    ),
    events = r.data?.events;
  if (!Number.isInteger(events) || events < 0 || events > 100000)
    throw new HttpsError("invalid-argument", "Enter a valid event count.");
  await db.runTransaction(async (t) => {
    await access(uid, true, t);
    t.set(db.doc("meta/settings"), { platformName, events });
    audit(t, uid, "settings.save", "settings");
  });
  return { ok: true };
});
export const maintenance = onCall(async (r) => {
  const uid = uidOf(r);
  if (typeof r.data?.enabled !== "boolean")
    throw new HttpsError("invalid-argument", "Choose a maintenance state.");
  await db.runTransaction(async (t) => {
    await access(uid, true, t, true);
    const state = await t.get(control);
    if (!r.data.enabled && state.get("repairRunning"))
      throw new HttpsError(
        "failed-precondition",
        "Finish reconciliation before reopening.",
      );
    t.set(control, { maintenance: r.data.enabled }, { merge: true });
    audit(t, uid, "maintenance", String(r.data.enabled));
  });
  return { ok: true };
});
export const reconcile = onCall({ timeoutSeconds: 540 }, async (r) => {
  const uid = uidOf(r);
  await access(uid, true, undefined, true);
  const gate = await control.get();
  if (!gate.get("maintenance"))
    throw new HttpsError(
      "failed-precondition",
      "Enable maintenance before previewing repairs.",
    );
  if (
    gate.get("repairRunning") &&
    Date.now() - (gate.get("repairLease") || 0) < 600000
  )
    throw new HttpsError(
      "aborted",
      "A reconciliation is already running. Wait before retrying.",
    );
  const [challenges, users, solves] = await Promise.all([
    db.collection("challenges").limit(501).get(),
    db.collection("users").limit(2001).get(),
    db.collection("solves").limit(50001).get(),
  ]);
  if (challenges.size > 500 || users.size > 2000 || solves.size > 50000)
    throw new HttpsError(
      "resource-exhausted",
      "Dataset exceeds repair capacity.",
    );
  const groups = new Map<string, typeof solves.docs>();
  for (const s of solves.docs) {
    const list = groups.get(s.get("challengeId")) || [];
    list.push(s);
    groups.set(s.get("challengeId"), list);
  }
  const counts = new Map<
      string,
      { points: number; solves: number; firstBloods: number }
    >(),
    changes: { path: string; values: Record<string, any> }[] = [];
  for (const [challengeId, group] of groups) {
    group.sort(
      (a, b) =>
        (a.get("solvedAt")?.toMillis() || 0) -
          (b.get("solvedAt")?.toMillis() || 0) || a.id.localeCompare(b.id),
    );
    for (const [i, s] of group.entries()) {
      const c = counts.get(s.get("uid")) || {
        points: 0,
        solves: 0,
        firstBloods: 0,
      };
      c.points += s.get("points") || 0;
      c.solves++;
      c.firstBloods += Number(i === 0);
      counts.set(s.get("uid"), c);
      if (s.get("isFirstBlood") !== (i === 0))
        changes.push({ path: s.ref.path, values: { isFirstBlood: i === 0 } });
    }
    const ch = challenges.docs.find((d) => d.id === challengeId);
    if (ch)
      changes.push({
        path: ch.ref.path,
        values: {
          solveCount: group.length,
          firstBloodUid: group[0].get("uid"),
          firstBloodName: group[0].get("playerName"),
          firstBloodTimestamp: group[0].get("solvedAt"),
        },
      });
  }
  for (const ch of challenges.docs)
    if (!groups.has(ch.id))
      changes.push({
        path: ch.ref.path,
        values: {
          solveCount: 0,
          firstBloodUid: null,
          firstBloodName: null,
          firstBloodTimestamp: null,
        },
      });
  for (const u of users.docs) {
    const c = counts.get(u.id) || { points: 0, solves: 0, firstBloods: 0 };
    changes.push(
      { path: u.ref.path, values: c },
      { path: `players/${u.id}`, values: player(u.id, { ...u.data(), ...c }) },
    );
  }
  const digest = createHash("sha256")
    .update(JSON.stringify(changes))
    .digest("hex");
  if (!r.data?.apply)
    return {
      digest,
      writes: changes.length,
      users: users.size,
      solves: solves.size,
      changes: changes.map((c) => ({ path: c.path, values: c.values })),
    };
  if (r.data.digest !== digest)
    throw new HttpsError(
      "failed-precondition",
      "Data changed. Preview reconciliation again.",
    );
  const operation = db.collection("audit").doc().id;
  await db.runTransaction(async (t) => {
    await access(uid, true, t, true);
    const state = await t.get(control);
    if (
      !state.get("maintenance") ||
      !state.updateTime?.isEqual(gate.updateTime!) ||
      (state.get("repairRunning") &&
        Date.now() - (state.get("repairLease") || 0) < 600000)
    )
      throw new HttpsError(
        "aborted",
        "Maintenance state changed. Preview again.",
      );
    t.set(
      control,
      {
        repairRunning: true,
        repairOperation: operation,
        repairLease: Date.now(),
      },
      { merge: true },
    );
  });
  // ponytail: checkpointed batches under maintenance, capped at 50,000 solves.
  for (let start = 0; start < changes.length; start += 400)
    await db.runTransaction(async (t) => {
      await access(uid, true, t, true);
      const state = await t.get(control);
      if (
        !state.get("maintenance") ||
        state.get("repairOperation") !== operation
      )
        throw new HttpsError(
          "failed-precondition",
          "Repair lock changed. Preview again.",
        );
      for (const c of changes.slice(start, start + 400))
        t.set(db.doc(c.path), c.values, { merge: true });
      t.set(
        control,
        {
          repairCheckpoint: start + Math.min(400, changes.length - start),
          repairLease: Date.now(),
        },
        { merge: true },
      );
    });
  await db.runTransaction(async (t) => {
    await access(uid, true, t, true);
    const state = await t.get(control);
    if (state.get("repairOperation") !== operation)
      throw new HttpsError("aborted", "Repair lock changed.");
    t.set(control, { repairRunning: false }, { merge: true });
    audit(t, uid, "reconcile", digest);
  });
  return { digest, writes: changes.length, applied: true };
});
