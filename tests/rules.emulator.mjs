import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

test("anonymous, learner, suspended, and admin access matrix", async () => {
  const env = await initializeTestEnvironment({
    projectId: "demo-flagforge",
    firestore: { rules: await readFile("firestore.rules", "utf8") },
  });
  try {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      for (const [path, data] of Object.entries({
        "users/learner": {
          uid: "learner",
          role: "student",
          suspended: false,
          email: "private@example.test",
        },
        "users/other": {
          uid: "other",
          role: "student",
          suspended: false,
          email: "other@example.test",
        },
        "users/admin": { uid: "admin", role: "admin", suspended: false },
        "users/suspended": {
          uid: "suspended",
          role: "student",
          suspended: true,
        },
        "challenges/public": { published: true, title: "Public exercise" },
        "challenges/draft": { published: false },
        "challengeSecrets/public": { flag: "FLAG{private}" },
        "players/other": { displayName: "Other", points: 10 },
        "solves/other_public": { uid: "other" },
        "attempts/other_public": { uid: "other", count: 1 },
        "usernames/other": { uid: "other" },
      }))
        await setDoc(doc(db, path), data);
    });
    const anonymous = env.unauthenticatedContext().firestore(),
      learner = env.authenticatedContext("learner").firestore(),
      admin = env.authenticatedContext("admin").firestore(),
      suspended = env.authenticatedContext("suspended").firestore();
    await assertFails(getDoc(doc(anonymous, "challenges/public")));
    await assertSucceeds(getDoc(doc(learner, "users/learner")));
    await assertFails(getDoc(doc(learner, "users/other")));
    await assertSucceeds(getDoc(doc(admin, "users/other")));
    await assertSucceeds(getDoc(doc(learner, "challenges/public")));
    await assertSucceeds(getDoc(doc(learner, "challenges/removed")));
    await assertSucceeds(
      getDocs(
        query(
          collection(learner, "challenges"),
          where("published", "==", true),
        ),
      ),
    );
    await assertFails(getDocs(collection(learner, "challenges")));
    await assertFails(getDoc(doc(learner, "challenges/draft")));
    await assertSucceeds(getDoc(doc(admin, "challenges/draft")));
    await assertSucceeds(getDoc(doc(learner, "players/other")));
    await assertSucceeds(getDoc(doc(learner, "solves/learner_public")));
    await assertSucceeds(getDoc(doc(learner, "attempts/learner_public")));
    await assertFails(getDoc(doc(learner, "attempts/other_public")));
    await assertFails(getDoc(doc(suspended, "challenges/public")));
    await assertSucceeds(getDoc(doc(suspended, "users/suspended")));
    for (const db of [anonymous, learner, admin, suspended]) {
      await assertFails(getDoc(doc(db, "challengeSecrets/public")));
      await assertFails(getDoc(doc(db, "usernames/other")));
      for (const path of [
        "users/learner",
        "players/learner",
        "solves/learner_public",
        "attempts/learner_public",
        "challenges/public",
        "meta/settings",
      ])
        await assertFails(
          setDoc(doc(db, path), { role: "admin", points: 99999 }),
        );
    }
  } finally {
    await env.cleanup();
  }
});
