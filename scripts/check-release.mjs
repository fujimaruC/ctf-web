import { existsSync } from "node:fs";
for (const path of [".env.local", ".env"])
  if (existsSync(path)) process.loadEnvFile(path);
const env = process.env;
const mode = env.VITE_DATA_MODE;
const release = ["production", "branch-deploy"].includes(env.CONTEXT || "");
if (!['demo', 'firebase'].includes(mode))
  throw new Error("VITE_DATA_MODE must be exactly demo or firebase; refusing an implicit data source.");
if (release && mode !== "firebase")
  throw new Error("Production and branch deploys must use Firebase, not preview fixtures.");
if (mode === "firebase") {
  const required = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_APP_ID",
  ];
  if (release)
    required.push(
      "VITE_SUPPORT_EMAIL",
      "VITE_USE_EMULATORS",
      "FLAGFORGE_RELEASE_READY",
      "FIREBASE_ADMIN_PROJECT_ID",
      "FIREBASE_ADMIN_CLIENT_EMAIL",
      "FIREBASE_ADMIN_PRIVATE_KEY",
    );
  const missing = required.filter((key) => !env[key]);
  if (missing.length)
    throw new Error(
      `Release configuration is incomplete: ${missing.join(", ")}. See docs/ROLLOUT.md.`,
    );
  if (
    release &&
    (env.VITE_USE_EMULATORS !== "false" ||
      env.FLAGFORGE_RELEASE_READY !== "reviewed")
  )
    throw new Error(
      "Production and branch deploys require a reviewed release and real Firebase configuration.",
    );
}
