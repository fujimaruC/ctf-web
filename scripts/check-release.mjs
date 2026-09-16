import { existsSync } from "node:fs";
for (const path of [".env.local", ".env"])
  if (existsSync(path)) process.loadEnvFile(path);
const env = process.env;
if (env.CONTEXT === "production" && env.VITE_DATA_MODE !== "firebase")
  throw new Error("Production must use Firebase, not preview fixtures.");
if (env.VITE_DATA_MODE === "firebase") {
  const required = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_APP_ID",
    "VITE_FIREBASE_REGION",
  ];
  if (env.CONTEXT === "production")
    required.push("VITE_SUPPORT_EMAIL", "FLAGFORGE_RELEASE_READY");
  const missing = required.filter((key) => !env[key]);
  if (missing.length)
    throw new Error(
      `Release configuration is incomplete: ${missing.join(", ")}. See docs/ROLLOUT.md.`,
    );
  if (
    env.CONTEXT === "production" &&
    (env.VITE_USE_EMULATORS === "true" ||
      env.FLAGFORGE_RELEASE_READY !== "reviewed")
  )
    throw new Error(
      "Production requires a reviewed release and real Firebase configuration.",
    );
}
