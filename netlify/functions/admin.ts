import { cert, deleteApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const name = "flagforge-netlify";
export function admin() {
  const existing = getApps().find((app) => app.name === name);
  if (existing) return { auth: getAuth(existing), db: getFirestore(existing) };
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID || process.env.GCLOUD_PROJECT;
  if (!projectId) throw new Error("Firebase Admin is not configured.");
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const app = privateKey && process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    ? initializeApp({ credential: cert({ projectId, clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL, privateKey }) }, name)
    : process.env.FIRESTORE_EMULATOR_HOST && process.env.FIREBASE_AUTH_EMULATOR_HOST
      ? initializeApp({ projectId }, name)
      : (() => { throw new Error("Firebase Admin is not configured."); })();
  return { auth: getAuth(app), db: getFirestore(app) };
}
export async function resetAdminForTests() {
  const app = getApps().find((value) => value.name === name);
  if (app) await deleteApp(app);
}
