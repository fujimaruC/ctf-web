import { createHash } from "node:crypto";
import type { Auth } from "firebase-admin/auth";
import {
  FieldPath,
  FieldValue,
  type Firestore,
  type Transaction,
} from "firebase-admin/firestore";
import {
  challengeInput,
  comparePlayers,
  flagMatches,
  text,
  username,
} from "./domain.js";

const BATCH_SIZE = 50;
const controlPath = "meta/control";
type Data = Record<string, any>;
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const fail = (code: string, message: string): never => {
  throw new ApiError(code, message);
};
function parsed<T>(fn: () => T): T {
  try {
    return fn();
  } catch (error) {
    return fail(
      "invalid-argument",
      error instanceof Error ? error.message : "Check your input.",
    );
  }
}
function id(value: unknown) {
  const result = parsed(() => text(value, "ID", 160));
  if (!/^[A-Za-z0-9_-]+$/.test(result)) fail("invalid-argument", "Invalid ID.");
  return result;
}
function object(value: unknown): Data {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail("invalid-argument", "Invalid request.");
  return value as Data;
}
function player(uid: string, profile: Data) {
  return {
    uid,
    displayName: profile.displayName,
    username: profile.username,
    points: profile.points || 0,
    solves: profile.solves || 0,
    firstBloods: profile.firstBloods || 0,
  };
}
function token(run: string, step: number) {
  return `${run}.${step}`;
}
function parsedToken(value: unknown) {
  if (typeof value !== "string") throw new ApiError("invalid-argument", "Invalid continuation.");
  const match = /^([A-Za-z0-9_-]{20})\.([0-9]{1,9})$/.exec(value);
  if (!match) throw new ApiError("invalid-argument", "Invalid continuation.");
  return { run: match[1], step: Number(match[2]) };
}

export function createAcademy(db: Firestore, auth: Auth) {
  const control = db.doc(controlPath);
  const stamp = () => FieldValue.serverTimestamp();
  async function access(
    uid: string,
    admin = false,
    transaction?: Transaction,
    allowMaintenance = false,
  ) {
    const read = (path: string) =>
      transaction ? transaction.get(db.doc(path)) : db.doc(path).get();
    const [user, state] = await Promise.all([read(`users/${uid}`), read(controlPath)]);
    if (!user.exists) fail("failed-precondition", "Complete your profile first.");
    if (user.get("suspended") === true)
      fail("permission-denied", "Your academy access is suspended.");
    if (admin && user.get("role") !== "admin")
      fail("permission-denied", "Administrator access is required.");
    if (state.get("maintenance") && !allowMaintenance)
      fail("unavailable", "The academy is undergoing maintenance. Please try again later.");
    return user.data()!;
  }
  function audit(transaction: Transaction, uid: string, action: string, target: string) {
    transaction.set(db.collection("audit").doc(), { uid, action, target, at: stamp() });
  }
  async function saveProfile(uid: string, data: Data) {
    const displayName = parsed(() => text(data.displayName, "Display name", 100, 2));
    const handle = parsed(() => username(data.username));
    const identity = await auth.getUser(uid);
    if (identity.disabled) fail("permission-denied", "Your account is suspended.");
    return db.runTransaction(async (transaction) => {
      const ref = db.doc(`users/${uid}`);
      const [existing, slot, state] = await Promise.all([
        transaction.get(ref), transaction.get(db.doc(`usernames/${handle}`)), transaction.get(control),
      ]);
      if (state.get("maintenance")) fail("unavailable", "The academy is undergoing maintenance.");
      if (existing.get("suspended")) fail("permission-denied", "Your account is suspended.");
      if (slot.exists && slot.get("uid") !== uid)
        fail("already-exists", "That username is taken. Choose another.");
      const old = existing.data();
      const oldHandle = old?.username?.toLowerCase();
      const oldSlot = oldHandle && oldHandle !== handle
        ? await transaction.get(db.doc(`usernames/${oldHandle}`)) : null;
      const profile = {
        ...(old || { uid, role: "student", points: 0, solves: 0, firstBloods: 0, createdAt: stamp(), suspended: false }),
        displayName, username: handle, email: identity.email || "", avatar: old?.avatar || null,
      };
      transaction.set(ref, profile);
      transaction.set(db.doc(`usernames/${handle}`), { uid });
      if (oldSlot?.get("uid") === uid) transaction.delete(oldSlot.ref);
      transaction.set(db.doc(`players/${uid}`), player(uid, profile));
      return player(uid, profile);
    });
  }
  async function submitFlag(uid: string, data: Data) {
    const challengeId = id(data.challengeId), requestId = id(data.requestId);
    const flag = parsed(() => text(data.flag, "Flag", 2048));
    return db.runTransaction(async (transaction) => {
      const profile = await access(uid, false, transaction);
      const challenge = db.doc(`challenges/${challengeId}`), solve = db.doc(`solves/${uid}_${challengeId}`);
      const attempt = db.doc(`attempts/${uid}_${challengeId}`), request = db.doc(`users/${uid}/requests/${requestId}`);
      const [challengeDoc, secret, solveDoc, attemptDoc, prior] = await Promise.all([
        transaction.get(challenge), transaction.get(db.doc(`challengeSecrets/${challengeId}`)),
        transaction.get(solve), transaction.get(attempt), transaction.get(request),
      ]);
      if (!challengeDoc.exists || !challengeDoc.get("published") || !secret.exists)
        fail("not-found", "This challenge is unavailable.");
      if (prior.exists) {
        if (prior.get("challengeId") !== challengeId) fail("invalid-argument", "Use a new request ID.");
        return prior.get("result");
      }
      if (solveDoc.exists) return { outcome: "alreadySolved", attempts: attemptDoc.get("count") || 0, points: solveDoc.get("points"), firstBlood: solveDoc.get("isFirstBlood") };
      const now = Date.now();
      const recent: number[] = (attemptDoc.get("recent") || []).filter((time: number) => time > now - 300000);
      if (recent.length >= 10) fail("resource-exhausted", "Attempt limit reached. Try again in five minutes.");
      const attempts = (attemptDoc.get("count") || 0) + 1;
      const correct = flagMatches(flag, secret.get("flag"), secret.get("caseInsensitive"));
      const firstBlood = correct && !(challengeDoc.get("solveCount") || 0) && !challengeDoc.get("firstBloodUid");
      const points = correct ? challengeDoc.get("points") : 0;
      const result = { outcome: correct ? "correct" : "incorrect", attempts, points, firstBlood };
      transaction.set(attempt, { uid, challengeId, count: attempts, recent: [...recent, now] });
      transaction.set(request, { challengeId, result, at: stamp() });
      if (correct) {
        transaction.set(solve, { uid, challengeId, challengeName: challengeDoc.get("title"), category: challengeDoc.get("category"), difficulty: challengeDoc.get("difficulty"), playerName: profile.displayName, points, solvedAt: stamp(), isFirstBlood: firstBlood });
        transaction.update(challenge, { solveCount: (challengeDoc.get("solveCount") || 0) + 1, ...(firstBlood ? { firstBloodUid: uid, firstBloodName: profile.displayName, firstBloodTimestamp: stamp() } : {}) });
        const next = { ...profile, points: (profile.points || 0) + points, solves: (profile.solves || 0) + 1, firstBloods: (profile.firstBloods || 0) + Number(firstBlood) };
        transaction.update(db.doc(`users/${uid}`), { points: next.points, solves: next.solves, firstBloods: next.firstBloods });
        transaction.set(db.doc(`players/${uid}`), player(uid, next));
      }
      return result;
    });
  }
  async function leaderboard(uid: string) {
    await access(uid);
    const docs = await db.collection("players").limit(2001).get();
    if (docs.size > 2000) fail("resource-exhausted", "Ranking capacity needs an administrator review.");
    const players = docs.docs.map((doc) => ({ ...doc.data(), uid: doc.id })).sort(comparePlayers).map((value, rank) => ({ ...value, rank: rank + 1 }));
    return { players: players.slice(0, 50), me: players.find((value) => value.uid === uid) || null };
  }
  async function publicStats() {
    const [challenges, people, solves, settings] = await Promise.all([
      db.collection("challenges").where("published", "==", true).count().get(),
      db.collection("players").count().get(), db.collection("solves").count().get(), db.doc("meta/settings").get(),
    ]);
    return { challenges: challenges.data().count, players: people.data().count, solves: solves.data().count, events: settings.get("events") || 0 };
  }
  async function adminChallenge(uid: string, data: Data) {
    await access(uid, true);
    const action = data.action;
    const ref = data.id ? db.doc(`challenges/${id(data.id)}`) : db.collection("challenges").doc();
    if (action === "read") {
      const [challenge, secret] = await Promise.all([ref.get(), db.doc(`challengeSecrets/${ref.id}`).get()]);
      if (!challenge.exists) fail("not-found", "Challenge not found.");
      return { ...challenge.data(), id: ref.id, flag: secret.get("flag") || "", caseInsensitive: secret.get("caseInsensitive") || false };
    }
    const content = action === "save" ? parsed(() => challengeInput(object(data.challenge))) : null;
    const flag = content ? parsed(() => text(object(data.challenge).flag, "Flag", 2048)) : "";
    await db.runTransaction(async (transaction) => {
      await access(uid, true, transaction);
      const old = await transaction.get(ref);
      if (action === "delete") {
        if (!old.exists) fail("not-found", "Challenge already removed.");
        transaction.delete(ref); transaction.delete(db.doc(`challengeSecrets/${ref.id}`));
      } else if (action === "publish") {
        if (!old.exists || typeof data.published !== "boolean") fail("invalid-argument", "Invalid publication update.");
        transaction.update(ref, { published: data.published, updatedAt: stamp() });
      } else if (content) {
        transaction.set(ref, { ...(old.exists ? old.data() : { createdAt: stamp(), solveCount: 0, firstBloodUid: null }), ...content, updatedAt: stamp() });
        transaction.set(db.doc(`challengeSecrets/${ref.id}`), { flag, caseInsensitive: object(data.challenge).caseInsensitive });
      } else fail("invalid-argument", "Unknown challenge operation.");
      audit(transaction, uid, `challenge.${action}`, ref.id);
    });
    return { id: ref.id };
  }
  async function adminAccount(uid: string, data: Data) {
    const target = id(data.uid), action = data.action;
    if (action === "role" && !["admin", "student"].includes(data.role)) fail("invalid-argument", "Choose the desired role.");
    if (! ["role", "suspend", "reinstate"].includes(action)) fail("invalid-argument", "Unknown account action.");
    if (target === uid) fail("failed-precondition", "Ask another administrator to change your access.");
    await db.runTransaction(async (transaction) => {
      await access(uid, true, transaction);
      const ref = db.doc(`users/${target}`);
      const [user, admins] = await Promise.all([transaction.get(ref), transaction.get(db.collection("users").where("role", "==", "admin"))]);
      if (!user.exists) fail("not-found", "Account not found.");
      if (user.get("role") === "admin" && !user.get("suspended") && (action === "suspend" || (action === "role" && data.role === "student")) && admins.docs.filter((doc) => !doc.get("suspended")).length <= 1)
        fail("failed-precondition", "Keep at least one active administrator.");
      transaction.update(ref, action === "role" ? { role: data.role } : { suspended: action === "suspend" });
      audit(transaction, uid, `account.${action}`, target);
    });
    if (action !== "role") { await auth.updateUser(target, { disabled: action === "suspend" }); if (action === "suspend") await auth.revokeRefreshTokens(target); }
    return { ok: true };
  }
  async function adminSettings(uid: string, data: Data) {
    const platformName = parsed(() => text(data.platformName, "Platform name", 80));
    if (!Number.isInteger(data.events) || data.events < 0 || data.events > 100000) fail("invalid-argument", "Enter a valid event count.");
    await db.runTransaction(async (transaction) => { await access(uid, true, transaction); transaction.set(db.doc("meta/settings"), { platformName, events: data.events }); audit(transaction, uid, "settings.save", "settings"); });
    return { ok: true };
  }
  async function maintenance(uid: string, data: Data) {
    if (typeof data.enabled !== "boolean") fail("invalid-argument", "Choose a maintenance state.");
    await db.runTransaction(async (transaction) => { await access(uid, true, transaction, true); const state = await transaction.get(control); if (!data.enabled && state.get("repairRunning")) fail("failed-precondition", "Finish reconciliation before reopening."); transaction.set(control, { maintenance: data.enabled }, { merge: true }); audit(transaction, uid, "maintenance", String(data.enabled)); });
    return { ok: true };
  }
  function progress(run: Data, current = 0, repaired = 0) {
    const total = run.phase === "scan" ? run.totalSolves : run.phase === "solves" ? run.totalSolves : run.phase === "challenges" ? run.totalChallenges : run.totalUsers;
    return { digest: run.digest || "", writes: run.repaired || 0, users: run.totalUsers, solves: run.totalSolves, processed: current, repaired, remaining: Math.max(0, total - current), hasMore: run.phase !== "complete", continuation: run.phase === "complete" ? null : token(run.id, run.step), phase: run.phase, applied: run.phase === "complete" };
  }
  async function beginReconcile(uid: string) {
    await access(uid, true, undefined, true);
    const state = await control.get();
    if (!state.get("maintenance")) fail("failed-precondition", "Enable maintenance before previewing repairs.");
    if (state.get("repairRunning") && Date.now() - (state.get("repairLease") || 0) < 600000) fail("aborted", "A reconciliation is already running. Wait before retrying.");
    const [solves, users, challenges] = await Promise.all([db.collection("solves").count().get(), db.collection("users").count().get(), db.collection("challenges").count().get()]);
    const ref = db.collection("reconcileRuns").doc();
    const run = { id: ref.id, owner: uid, phase: "scan", step: 0, solveCursor: null, solveProcessed: 0, challengeCursor: null, challengeProcessed: 0, userCursor: null, userProcessed: 0, totalSolves: solves.data().count, totalUsers: users.data().count, totalChallenges: challenges.data().count, repaired: 0, createdAt: stamp(), updatedAt: stamp() };
    await db.runTransaction(async (transaction) => { await access(uid, true, transaction, true); const gate = await transaction.get(control); if (!gate.get("maintenance") || (gate.get("repairRunning") && Date.now() - (gate.get("repairLease") || 0) < 600000)) fail("aborted", "Maintenance state changed. Preview again."); transaction.set(ref, run); transaction.set(control, { repairRunning: true, repairOperation: ref.id, repairLease: Date.now(), repairCheckpoint: 0 }, { merge: true }); });
    return progress(run);
  }
  async function reconcile(uid: string, data: Data) {
    if (!data.token) return beginReconcile(uid);
    const value = parsedToken(data.token), ref = db.doc(`reconcileRuns/${value.run}`), snapshot = await ref.get();
    if (!snapshot.exists) fail("not-found", "Reconciliation session not found.");
    const run = snapshot.data()!;
    await access(uid, true, undefined, true);
    if (run.phase === "ready" && data.apply !== true) return progress(run, run.solveProcessed);
    if (run.phase === "ready" && data.apply === true) {
      if (data.digest !== run.digest) fail("failed-precondition", "Data changed. Preview reconciliation again.");
      await db.runTransaction(async (transaction) => { await access(uid, true, transaction, true); const current = await transaction.get(ref); if (current.get("step") !== value.step || current.get("phase") !== "ready") return; transaction.update(ref, { phase: "solves", step: value.step + 1, updatedAt: stamp() }); transaction.set(control, { repairLease: Date.now() }, { merge: true }); });
      return progress({ ...run, phase: "solves", step: value.step + 1 });
    }
    if (run.phase === "complete") return progress(run, run.userProcessed, 0);
    if (run.step !== value.step) return progress(run, run.phase === "scan" ? run.solveProcessed : run.phase === "solves" ? run.solveProcessed : run.phase === "challenges" ? run.challengeProcessed : run.userProcessed);
    if (run.phase === "scan") return scanBatch(uid, ref, run, value.step);
    if (run.phase === "solves") return solveBatch(uid, ref, run, value.step);
    if (run.phase === "challenges") return challengeBatch(uid, ref, run, value.step);
    return userBatch(uid, ref, run, value.step);
  }
  async function scanBatch(uid: string, ref: ReturnType<Firestore["doc"]>, run: Data, step: number) {
    let query: FirebaseFirestore.Query = db.collection("solves").orderBy(FieldPath.documentId()).limit(BATCH_SIZE);
    if (run.solveCursor) query = query.startAfter(run.solveCursor);
    const page = await query.get(), last = page.docs.at(-1)?.id || run.solveCursor;
    await db.runTransaction(async (transaction) => {
      await access(uid, true, transaction, true); const current = await transaction.get(ref); if (current.get("step") !== step || current.get("phase") !== "scan") return;
      const challengeRefs = [...new Set(page.docs.map((doc) => doc.get("challengeId")).filter((value): value is string => typeof value === "string"))].map((value) => db.doc(`reconcileRuns/${run.id}/challenges/${value}`));
      const existing = await Promise.all(challengeRefs.map((challenge) => transaction.get(challenge)));
      const byChallenge = new Map(existing.map((snapshot) => [snapshot.id, snapshot]));
      const userChanges = new Map<string, { points: number; solves: number; firstBloods: number }>();
      const challengeChanges = new Map<string, Data>();
      for (const solve of page.docs) {
        const challengeId = solve.get("challengeId"), solveUid = solve.get("uid");
        if (typeof challengeId !== "string" || typeof solveUid !== "string") continue;
        const user = userChanges.get(solveUid) || { points: 0, solves: 0, firstBloods: 0 };
        user.points += solve.get("points") || 0; user.solves++;
        const prior = challengeChanges.get(challengeId) || byChallenge.get(challengeId)?.data() || { count: 0, firstSolveId: null, firstBloodUid: null, firstBloodName: null, firstBloodTimestamp: null };
        const timestamp = solve.get("solvedAt")?.toMillis?.() || 0;
        const priorTime = prior.firstBloodTimestamp?.toMillis?.() || 0;
        const earlier = !prior.firstSolveId || timestamp < priorTime || (timestamp === priorTime && solve.id.localeCompare(prior.firstSolveId) < 0);
        if (earlier) {
          if (prior.firstBloodUid) {
            const old = userChanges.get(prior.firstBloodUid) || { points: 0, solves: 0, firstBloods: 0 };
            old.firstBloods--;
            userChanges.set(prior.firstBloodUid, old);
          }
          user.firstBloods++;
        }
        challengeChanges.set(challengeId, { ...prior, count: (prior.count || 0) + 1, ...(earlier ? { firstSolveId: solve.id, firstBloodUid: solveUid, firstBloodName: solve.get("playerName"), firstBloodTimestamp: solve.get("solvedAt") } : {}) });
        userChanges.set(solveUid, user);
      }
      for (const [target, values] of userChanges) transaction.set(db.doc(`reconcileRuns/${run.id}/users/${target}`), { points: FieldValue.increment(values.points), solves: FieldValue.increment(values.solves), firstBloods: FieldValue.increment(values.firstBloods) }, { merge: true });
      for (const [target, values] of challengeChanges) transaction.set(db.doc(`reconcileRuns/${run.id}/challenges/${target}`), values, { merge: true });
      const done = page.size < BATCH_SIZE;
      const next = { solveCursor: last, solveProcessed: (run.solveProcessed || 0) + page.size, step: step + 1, phase: done ? "ready" : "scan", updatedAt: stamp() } as Data;
      if (done) next.digest = createHash("sha256").update(JSON.stringify({ id: run.id, solves: run.totalSolves, users: run.totalUsers, challenges: run.totalChallenges, cursor: last || "" })).digest("hex");
      transaction.update(ref, next); transaction.set(control, { repairLease: Date.now(), repairCheckpoint: next.solveProcessed }, { merge: true });
    });
    const current = (await ref.get()).data()!; return progress(current, current.solveProcessed, 0);
  }
  async function solveBatch(uid: string, ref: ReturnType<Firestore["doc"]>, run: Data, step: number) {
    let query: FirebaseFirestore.Query = db.collection("solves").orderBy(FieldPath.documentId()).limit(BATCH_SIZE); if (run.solveCursorApply) query = query.startAfter(run.solveCursorApply);
    const page = await query.get(), last = page.docs.at(-1)?.id || run.solveCursorApply;
    const accumulators = await Promise.all([...new Set(page.docs.map((doc) => doc.get("challengeId")).filter((value): value is string => typeof value === "string"))].map((challenge) => db.doc(`reconcileRuns/${run.id}/challenges/${challenge}`).get()));
    const first = new Map(accumulators.map((value) => [value.id, value.get("firstSolveId")]));
    let repaired = 0;
    await db.runTransaction(async (transaction) => { await access(uid, true, transaction, true); const current = await transaction.get(ref); if (current.get("step") !== step || current.get("phase") !== "solves") return; for (const solve of page.docs) { const value = solve.id === first.get(solve.get("challengeId")); if (solve.get("isFirstBlood") !== value) { transaction.update(solve.ref, { isFirstBlood: value }); repaired++; } } const done = page.size < BATCH_SIZE; transaction.update(ref, { solveCursorApply: last, solveProcessedApply: (run.solveProcessedApply || 0) + page.size, repaired: (run.repaired || 0) + repaired, step: step + 1, phase: done ? "challenges" : "solves", updatedAt: stamp() }); transaction.set(control, { repairLease: Date.now() }, { merge: true }); });
    const current = (await ref.get()).data()!; return progress(current, current.solveProcessedApply, repaired);
  }
  async function challengeBatch(uid: string, ref: ReturnType<Firestore["doc"]>, run: Data, step: number) {
    let query: FirebaseFirestore.Query = db.collection("challenges").orderBy(FieldPath.documentId()).limit(BATCH_SIZE); if (run.challengeCursor) query = query.startAfter(run.challengeCursor);
    const page = await query.get(), last = page.docs.at(-1)?.id || run.challengeCursor; const values = await Promise.all(page.docs.map((doc) => db.doc(`reconcileRuns/${run.id}/challenges/${doc.id}`).get())); let repaired = 0;
    await db.runTransaction(async (transaction) => { await access(uid, true, transaction, true); const current = await transaction.get(ref); if (current.get("step") !== step || current.get("phase") !== "challenges") return; for (const [index, challenge] of page.docs.entries()) { const accumulator = values[index]; const next = accumulator.exists ? { solveCount: accumulator.get("count"), firstBloodUid: accumulator.get("firstBloodUid"), firstBloodName: accumulator.get("firstBloodName"), firstBloodTimestamp: accumulator.get("firstBloodTimestamp") } : { solveCount: 0, firstBloodUid: null, firstBloodName: null, firstBloodTimestamp: null }; if (Object.entries(next).some(([key, value]) => challenge.get(key) !== value)) { transaction.update(challenge.ref, next); repaired++; } } const done = page.size < BATCH_SIZE; transaction.update(ref, { challengeCursor: last, challengeProcessed: (run.challengeProcessed || 0) + page.size, repaired: (run.repaired || 0) + repaired, step: step + 1, phase: done ? "users" : "challenges", updatedAt: stamp() }); transaction.set(control, { repairLease: Date.now() }, { merge: true }); });
    const current = (await ref.get()).data()!; return progress(current, current.challengeProcessed, repaired);
  }
  async function userBatch(uid: string, ref: ReturnType<Firestore["doc"]>, run: Data, step: number) {
    let query: FirebaseFirestore.Query = db.collection("users").orderBy(FieldPath.documentId()).limit(BATCH_SIZE); if (run.userCursor) query = query.startAfter(run.userCursor);
    const page = await query.get(), last = page.docs.at(-1)?.id || run.userCursor; const values = await Promise.all(page.docs.map((doc) => db.doc(`reconcileRuns/${run.id}/users/${doc.id}`).get())); let repaired = 0;
    await db.runTransaction(async (transaction) => { await access(uid, true, transaction, true); const current = await transaction.get(ref); if (current.get("step") !== step || current.get("phase") !== "users") return; for (const [index, user] of page.docs.entries()) { const accumulator = values[index]; const next = accumulator.exists ? { points: accumulator.get("points") || 0, solves: accumulator.get("solves") || 0, firstBloods: accumulator.get("firstBloods") || 0 } : { points: 0, solves: 0, firstBloods: 0 }; if (Object.entries(next).some(([key, value]) => user.get(key) !== value)) { transaction.update(user.ref, next); transaction.set(db.doc(`players/${user.id}`), player(user.id, { ...user.data(), ...next })); repaired += 2; } } const done = page.size < BATCH_SIZE; transaction.update(ref, { userCursor: last, userProcessed: (run.userProcessed || 0) + page.size, repaired: (run.repaired || 0) + repaired, step: step + 1, phase: done ? "complete" : "users", updatedAt: stamp() }); transaction.set(control, { repairLease: Date.now(), repairRunning: !done }, { merge: true }); if (done) audit(transaction, uid, "reconcile", run.digest); });
    const current = (await ref.get()).data()!; return progress(current, current.userProcessed, repaired);
  }
  const actions: Record<string, (uid: string | null, data: Data) => Promise<any>> = {
    saveProfile: (uid, data) => saveProfile(uid || fail("unauthenticated", "Sign in to continue."), data),
    submitFlag: (uid, data) => submitFlag(uid || fail("unauthenticated", "Sign in to continue."), data),
    getLeaderboard: (uid) => leaderboard(uid || fail("unauthenticated", "Sign in to continue.")),
    publicStats: () => publicStats(),
    adminChallenge: (uid, data) => adminChallenge(uid || fail("unauthenticated", "Sign in to continue."), data),
    adminAccount: (uid, data) => adminAccount(uid || fail("unauthenticated", "Sign in to continue."), data),
    adminSettings: (uid, data) => adminSettings(uid || fail("unauthenticated", "Sign in to continue."), data),
    maintenance: (uid, data) => maintenance(uid || fail("unauthenticated", "Sign in to continue."), data),
    reconcile: (uid, data) => reconcile(uid || fail("unauthenticated", "Sign in to continue."), data),
  };
  return async (action: unknown, uid: string | null, data: unknown) => {
    if (typeof action !== "string" || !Object.hasOwn(actions, action)) fail("not-found", "Unknown operation.");
    return actions[action as keyof typeof actions](uid, object(data));
  };
}
