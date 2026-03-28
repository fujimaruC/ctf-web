// js/db.js
// Firestore CRUD operations — challenges, leaderboard, flag submission, score.

import { db }        from "./config.js";
import { sha256, validateFlag } from "./crypto.js";
import { logEvent }  from "./logger.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, increment,
  serverTimestamp, runTransaction, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ─── Dynamic Scoring ──────────────────────────────────────────────────────────
const DECAY_FACTOR = 10; // points lost per solve

export function calculatePoints(initialPoints, minPoints, solvesCount) {
  return Math.max(minPoints, initialPoints - solvesCount * DECAY_FACTOR);
}

// ─── Daily Challenge ──────────────────────────────────────────────────────────
/** Returns the most recently unlocked challenge (the "daily drop"). */
export async function getDailyChallenge() {
  const now = Timestamp.now();
  const q   = query(
    collection(db, "challenges"),
    where("unlockDate", "<=", now),
    orderBy("unlockDate", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return {
    id: snap.docs[0].id,
    ...data,
    currentPoints: calculatePoints(data.initialPoints, data.minPoints, data.solvesCount),
  };
}

// ─── Archive ──────────────────────────────────────────────────────────────────
/** Returns all challenges unlocked more than 24 hours ago. */
export async function getArchivedChallenges() {
  const cutoff = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const q      = query(
    collection(db, "challenges"),
    where("unlockDate", "<=", cutoff),
    orderBy("unlockDate", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      currentPoints: calculatePoints(data.initialPoints, data.minPoints, data.solvesCount),
    };
  });
}

// ─── Single Challenge ─────────────────────────────────────────────────────────
export async function getChallenge(challengeId) {
  const snap = await getDoc(doc(db, "challenges", challengeId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    ...data,
    currentPoints: calculatePoints(data.initialPoints, data.minPoints, data.solvesCount),
  };
}

// ─── Flag Submission ──────────────────────────────────────────────────────────
/**
 * Validates the flag via local hash comparison, then runs an atomic
 * Firestore transaction to award points and increment solvesCount.
 *
 * @param {string} uid
 * @param {string} challengeId
 * @param {string} rawFlag        — user's plaintext input
 * @returns {Promise<{success: boolean, points: number, message: string}>}
 */
export async function submitFlag(uid, challengeId, rawFlag) {
  // 1. Fetch challenge (includes flagHash)
  const challenge = await getChallenge(challengeId);
  if (!challenge) return { success: false, points: 0, message: "Challenge not found." };

  // 2. Zero-trust local hash validation
  const correct = await validateFlag(rawFlag, challenge.flagHash);

  if (!correct) {
    await logEvent(uid, "failed_flag", { challengeId, attemptHash: await sha256(rawFlag) });
    return { success: false, points: 0, message: "Incorrect flag. Try again." };
  }

  // 3. Atomic Firestore transaction — prevents double-solve race conditions
  const userRef      = doc(db, "users", uid);
  const challengeRef = doc(db, "challenges", challengeId);
  let awarded = 0;

  try {
    await runTransaction(db, async tx => {
      const userSnap = await tx.get(userRef);
      const cSnap    = await tx.get(challengeRef);

      if (!userSnap.exists() || !cSnap.exists()) throw new Error("Document missing.");

      const userData    = userSnap.data();
      const cData       = cSnap.data();

      // Prevent re-solving
      if ((userData.solves || []).includes(challengeId)) {
        throw new Error("ALREADY_SOLVED");
      }

      awarded = calculatePoints(cData.initialPoints, cData.minPoints, cData.solvesCount);

      tx.update(userRef, {
        score:       increment(awarded),
        solves:      [...(userData.solves || []), challengeId],
        lastSolveAt: serverTimestamp(),
        streak:      increment(1),
      });

      tx.update(challengeRef, {
        solvesCount: increment(1),
      });
    });
  } catch (err) {
    if (err.message === "ALREADY_SOLVED") {
      // Friendly message, no security log for re-solve attempt
      return { success: false, points: 0, message: "You already solved this challenge." };
    }
    
    // Check for permission denied errors
    if (err.code && err.code.includes("permission-denied")) {
      await logEvent(uid, "admin_access_denied", { 
        action: "flag_submit", 
        challengeId, 
        reason: "permission_denied" 
      });
      return { success: false, points: 0, message: "Server error, try again." };
    }
    
    // Generic error handling - never expose raw Firestore errors
    console.error("[Flag Submit Error]", err);
    return { success: false, points: 0, message: "Server error, try again." };
  }

  await logEvent(uid, "solved", { challengeId, pointsAwarded: awarded });
  return { success: true, points: awarded, message: `Flag accepted! +${awarded} pts` };
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export async function getLeaderboard(topN = 50) {
  const q    = query(collection(db, "users"), orderBy("score", "desc"), limit(topN));
  const snap = await getDocs(q);
  return snap.docs.map((d, i) => ({ rank: i + 1, id: d.id, ...d.data() }));
}

// ─── Admin: Create Challenge ──────────────────────────────────────────────────
/**
 * Auto-hashes the plain-text flag before writing to Firestore.
 * The raw flag is never stored.
 */
export async function createChallenge(adminUid, challengeData) {
  const { rawFlag, unlockDate, ...rest } = challengeData;
  const flagHash = await sha256(rawFlag);

  const payload = {
    ...rest,
    unlockDate: Timestamp.fromDate(unlockDate),
    flagHash,
    solvesCount: 0,
    createdBy:   adminUid,
    createdAt:   serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "challenges"), payload);
  await logEvent(adminUid, "login", { action: "challenge_created", challengeId: ref.id });
  return ref.id;
}

// ─── User Profile ─────────────────────────────────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── Admin: Update Challenge ──────────────────────────────────────────────────
/**
 * Updates a challenge's metadata. Only updates flagHash if newRawFlag is provided.
 */
export async function updateChallenge(challengeId, data) {
  const { rawFlag, ...rest } = data;
  const update = { ...rest };
  
  if (rawFlag && rawFlag.trim()) {
    update.flagHash = await sha256(rawFlag);
  }
  
  await updateDoc(doc(db, "challenges", challengeId), update);
}

// ─── Admin: Delete Challenge ──────────────────────────────────────────────────
export async function deleteChallenge(challengeId) {
  await deleteDoc(doc(db, "challenges", challengeId));
}

// ─── Admin: Get Challenge Count ──────────────────────────────────────────────
export async function getChallengeCount() {
  const snap = await getDocs(collection(db, "challenges"));
  return snap.size;
}

// ─── Admin: Get User Count ───────────────────────────────────────────────────
export async function getUserCount() {
  const snap = await getDocs(collection(db, "users"));
  return snap.size;
}

// ─── Admin: Get Total Solves ─────────────────────────────────────────────────
export async function getTotalSolves() {
  const snap = await getDocs(collection(db, "logs"), 
    where("action", "==", "solved")
  );
  return snap.size;
}

// ─── Admin: Get Most Solved Challenge ────────────────────────────────────────
export async function getMostSolvedChallenge() {
  const snap = await getDocs(
    query(collection(db, "challenges"), orderBy("solvesCount", "desc"), limit(1))
  );
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return {
    id: snap.docs[0].id,
    title: data.title,
    solvesCount: data.solvesCount,
  };
}

// ─── Get Recent Solves for Activity Feed ──────────────────────────────────────
/**
 * Returns the last N solve events from logs with user profile data.
 */
export async function getRecentSolves(limit_count = 5) {
  const q = query(
    collection(db, "logs"),
    where("action", "==", "solved"),
    orderBy("timestamp", "desc"),
    limit(limit_count)
  );
  const snap = await getDocs(q);
  
  const results = await Promise.all(snap.docs.map(async logDoc => {
    const logData = logDoc.data();
    const userSnap = await getDoc(doc(db, "users", logData.uid));
    const userData = userSnap.exists() ? userSnap.data() : { displayName: "Unknown" };
    
    const chalSnap = await getDoc(doc(db, "challenges", logData.details.challengeId));
    const chalData = chalSnap.exists() ? chalSnap.data() : { title: "Unknown" };
    
    return {
      uid: logData.uid,
      displayName: userData.displayName || "Unknown",
      challengeTitle: chalData.title || "Unknown",
      timestamp: logData.timestamp,
    };
  }));
  
  return results;
}

// ─── Get Recent Logs for Audit Panel ──────────────────────────────────────────
export async function getRecentLogs(limit_count = 20) {
  const q = query(
    collection(db, "logs"),
    orderBy("timestamp", "desc"),
    limit(limit_count)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// ─── Update User Profile ──────────────────────────────────────────────────────
export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, "users", uid), data);
}