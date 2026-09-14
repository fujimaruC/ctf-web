const admin = require("firebase-admin");

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

async function sha256Hex(value) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const authHeader = event.headers.authorization || event.headers.Authorization || "";
    if (!authHeader.startsWith("Bearer ")) return json(401, { error: "Authentication required" });

    const token = authHeader.slice(7).trim();
    if (!token) return json(401, { error: "Authentication required" });

    const body = JSON.parse(event.body || "{}");
    const challengeId = String(body.challengeId || "").trim();
    const flag = String(body.flag || "").trim();

    if (!challengeId || !flag || challengeId.length > 128 || flag.length > 512) {
      return json(400, { error: "Invalid submission" });
    }

    const app = getAdminApp();
    const auth = admin.auth(app);
    const db = admin.firestore(app);
    const decoded = await auth.verifyIdToken(token, true);
    const uid = decoded.uid;

    const challengeRef = db.collection("challenges").doc(challengeId);
    const userRef = db.collection("users").doc(uid);
    const solveRef = db.collection("solves").doc(`${uid}_${challengeId}`);
    const attemptRef = db.collection("attempts").doc(`${uid}_${challengeId}`);

    const submittedHash = await sha256Hex(flag);

    const result = await db.runTransaction(async tx => {
      const [chSnap, userSnap, solveSnap, attemptSnap] = await Promise.all([
        tx.get(challengeRef),
        tx.get(userRef),
        tx.get(solveRef),
        tx.get(attemptRef)
      ]);

      if (!chSnap.exists || !chSnap.data().published) throw new Error("NOT_FOUND");
      if (!userSnap.exists) throw new Error("USER_NOT_FOUND");
      if (solveSnap.exists) throw new Error("ALREADY_SOLVED");

      const ch = chSnap.data();
      const expectedHash = String(ch.flagHash || "");
      const legacyFlag = typeof ch.flag === "string" ? ch.flag : null;
      const legacyHash = legacyFlag ? await sha256Hex(legacyFlag) : "";
      const correct = expectedHash
        ? submittedHash === expectedHash
        : legacyHash && submittedHash === legacyHash;

      const oldAttempts = attemptSnap.exists ? Number(attemptSnap.data().count || 0) : 0;
      const newAttempts = oldAttempts + 1;
      tx.set(attemptRef, {
        uid,
        challengeId,
        count: newAttempts,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      if (!correct) return { correct: false, attempts: newAttempts };

      const user = userSnap.data();
      const solveCount = Number(ch.solveCount || 0);
      const isFirstBlood = solveCount === 0 && !ch.firstBloodUid;
      const points = Number(ch.points || 0);
      const now = admin.firestore.FieldValue.serverTimestamp();

      tx.set(solveRef, {
        uid,
        challengeId,
        challengeName: ch.title || "",
        category: ch.category || "Misc",
        points,
        difficulty: ch.difficulty || "Easy",
        playerName: user.displayName || decoded.name || "Player",
        solvedAt: now,
        isFirstBlood
      });

      const userUpdates = {
        points: Number(user.points || 0) + points,
        solves: Number(user.solves || 0) + 1
      };
      if (isFirstBlood) userUpdates.firstBloods = Number(user.firstBloods || 0) + 1;

      tx.update(userRef, userUpdates);

      const challengeUpdates = { solveCount: solveCount + 1 };
      if (isFirstBlood) {
        challengeUpdates.firstBloodUid = uid;
        challengeUpdates.firstBloodName = user.displayName || decoded.name || "Player";
        challengeUpdates.firstBloodTimestamp = now;
      }
      tx.update(challengeRef, challengeUpdates);

      return { correct: true, points, firstBlood: isFirstBlood };
    });

    if (!result.correct) return json(200, { correct: false, attempts: result.attempts });

    return json(200, {
      correct: true,
      points: result.points,
      firstBlood: result.firstBlood
    });
  } catch (error) {
    if (error.message === "NOT_FOUND") return json(404, { error: "Challenge not found" });
    if (error.message === "USER_NOT_FOUND") return json(403, { error: "User profile not found" });
    if (error.message === "ALREADY_SOLVED") return json(409, { error: "Already solved" });
    if (error.code === "auth/id-token-revoked" || error.code === "auth/id-token-expired" || error.code === "auth/argument-error") {
      return json(401, { error: "Authentication required" });
    }
    console.error("submit-flag failed:", error);
    return json(500, { error: "Submission failed" });
  }
};
