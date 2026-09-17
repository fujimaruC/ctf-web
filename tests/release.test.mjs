import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("production release rejects fixtures, missing configuration, and emulators", () => {
  const base = {
    ...process.env,
    CONTEXT: "production",
    VITE_DATA_MODE: "firebase",
    VITE_FIREBASE_API_KEY: "demo-key",
    VITE_FIREBASE_AUTH_DOMAIN: "localhost",
    VITE_FIREBASE_PROJECT_ID: "demo-flagforge",
    VITE_FIREBASE_APP_ID: "demo-app",
    VITE_SUPPORT_EMAIL: "instructor@example.test",
    FLAGFORGE_RELEASE_READY: "reviewed",
    VITE_USE_EMULATORS: "false",
  };
  const run = (env) =>
    spawnSync(process.execPath, ["scripts/check-release.mjs"], {
      env: { ...base, ...env },
      encoding: "utf8",
    });
  assert.equal(run({}).status, 0);
  for (const env of [
    { VITE_DATA_MODE: "demo" },
    { VITE_FIREBASE_API_KEY: "" },
    { VITE_SUPPORT_EMAIL: "" },
    { FLAGFORGE_RELEASE_READY: "" },
    { VITE_USE_EMULATORS: "true" },
  ])
    assert.notEqual(run(env).status, 0);
});
