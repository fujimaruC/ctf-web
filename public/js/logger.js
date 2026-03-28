// js/logger.js
// SIEM-ready structured logger — writes to Firestore & console.

import { db }         from "./config.js";
import { collection, addDoc, serverTimestamp } from
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const VALID_ACTIONS = ["login", "logout", "failed_flag", "solved", "admin_access_denied", "register"];

/**
 * @param {string} uid       — Firebase UID of the acting user
 * @param {string} action    — one of VALID_ACTIONS
 * @param {object} details   — arbitrary metadata (challengeId, ip, etc.)
 */
export async function logEvent(uid, action, details = {}) {
  if (!VALID_ACTIONS.includes(action)) {
    console.warn(`[Logger] Unknown action: ${action}`);
    return;
  }

  const now = new Date();

  // Firestore payload with server-side timestamp
  const firestorePayload = {
    uid,
    action,
    details,
    timestamp: serverTimestamp(),
    userAgent: navigator.userAgent,
    origin:    window.location.origin,
    referrer:  document.referrer,
    page:      window.location.pathname,
  };

  // SIEM-ready structured console output with ISO timestamp
  console.log(JSON.stringify({
    level:   action.includes("fail") || action.includes("denied") ? "WARN" : "INFO",
    service: "ctf-daily",
    uid,
    action,
    details,
    userAgent: navigator.userAgent,
    origin:    window.location.origin,
    referrer:  document.referrer,
    page:      window.location.pathname,
    timestamp: now.toISOString(),
  }));

  try {
    await addDoc(collection(db, "logs"), firestorePayload);
  } catch (err) {
    console.error("[Logger] Failed to write log:", err.message);
  }
}