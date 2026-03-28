// js/auth.js
// Authentication: Login, Registration, Logout, Role Guards

import { auth, db }   from "./config.js";
import { logEvent }   from "./logger.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, setDoc, getDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/** Sign in and redirect based on role */
export async function login(email, password) {
  const cred     = await signInWithEmailAndPassword(auth, email, password);
  const userSnap = await getDoc(doc(db, "users", cred.user.uid));
  const userData = userSnap.data();

  await logEvent(cred.user.uid, "login", { email });

  if (userData.role === "admin") {
    window.location.href = "/admin.html";
  } else {
    window.location.href = "/dashboard.html";
  }
}

/** Register a new student account */
export async function register(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await setDoc(doc(db, "users", cred.user.uid), {
    email,
    displayName,
    role:        "student",
    score:       0,
    solves:      [],
    lastSolveAt: null,
    streak:      0,
    createdAt:   serverTimestamp(),
  });
  await logEvent(cred.user.uid, "register", { email });
  window.location.href = "/dashboard.html";
}

/** Sign out */
export async function logout() {
  const uid = auth.currentUser?.uid;
  await signOut(auth);
  if (uid) await logEvent(uid, "logout", {});
  window.location.href = "/index.html";
}

/**
 * Route guard — resolves with the user+profile or redirects.
 * @param {"student"|"admin"|"any"} requiredRole
 * @returns {Promise<{user, profile}>}
 */
export function requireAuth(requiredRole = "any") {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async user => {
      unsub();
      if (!user) {
        window.location.href = "/index.html";
        return reject("unauthenticated");
      }
      const snap    = await getDoc(doc(db, "users", user.uid));
      const profile = snap.data();

      if (requiredRole === "admin" && profile.role !== "admin") {
        await logEvent(user.uid, "admin_access_denied", { attemptedRoute: window.location.pathname });
        window.location.href = "/dashboard.html";
        return reject("forbidden");
      }
      resolve({ user, profile });
    });
  });
}