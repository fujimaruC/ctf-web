import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";

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
    FIREBASE_ADMIN_PROJECT_ID: "demo-flagforge",
    FIREBASE_ADMIN_CLIENT_EMAIL: "function@example.test",
    FIREBASE_ADMIN_PRIVATE_KEY: "not-a-real-key",
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
    { VITE_USE_EMULATORS: "" },
    { FIREBASE_ADMIN_PRIVATE_KEY: "" },
  ])
    assert.notEqual(run(env).status, 0);
});

test("branch releases reject demo, absent, and misspelled data modes", () => {
  const base = {
    ...process.env,
    CONTEXT: "branch-deploy",
    VITE_DATA_MODE: "firebase",
    VITE_FIREBASE_API_KEY: "demo-key",
    VITE_FIREBASE_AUTH_DOMAIN: "localhost",
    VITE_FIREBASE_PROJECT_ID: "demo-flagforge",
    VITE_FIREBASE_APP_ID: "demo-app",
    VITE_SUPPORT_EMAIL: "instructor@example.test",
    VITE_USE_EMULATORS: "false",
    FLAGFORGE_RELEASE_READY: "reviewed",
    FIREBASE_ADMIN_PROJECT_ID: "demo-flagforge",
    FIREBASE_ADMIN_CLIENT_EMAIL: "function@example.test",
    FIREBASE_ADMIN_PRIVATE_KEY: "not-a-real-key",
  };
  const run = (env) => spawnSync(process.execPath, ["scripts/check-release.mjs"], {
    env: { ...base, ...env }, encoding: "utf8",
  });
  assert.equal(run({}).status, 0);
  for (const VITE_DATA_MODE of ["demo", "", "Firebase", "preview"])
    assert.notEqual(run({ VITE_DATA_MODE }).status, 0);
});

test("the Firebase path is exact, removes obsolete preview state, and uses Google auth", async () => {
  const [data, firebase, auth, netlify] = await Promise.all([
    readFile("app/src/data.ts", "utf8"),
    readFile("app/src/firebase.ts", "utf8"),
    readFile("app/src/pages/Auth.tsx", "utf8"),
    readFile("netlify.toml", "utf8"),
  ]);
  assert.match(data, /mode !== "demo" && mode !== "firebase"/);
  assert.match(data, /import\("\.\/demo"\)/);
  assert.match(data, /import\("\.\/firebase"\)/);
  assert.match(firebase, /new GoogleAuthProvider\(\)/);
  assert.match(firebase, /prompt: "select_account"/);
  assert.match(firebase, /signInWithPopup/);
  assert.match(firebase, /signInWithRedirect/);
  assert.match(firebase, /sessionStorage\.removeItem\(\["flagforge", "preview", "user"\]\.join/);
  assert.match(auth, /academy\)\.signInWithGoogle\(\)/);
  assert.match(netlify, /\[context\.branch-deploy\.environment\]\s+VITE_DATA_MODE = "firebase"/);
  assert.match(netlify, /\[context\.deploy-preview\.environment\][\s\S]*VITE_DATA_MODE = "demo"/);
  assert.doesNotMatch(
    netlify.slice(netlify.indexOf("[build.environment]"), netlify.indexOf("[functions]")),
    /VITE_DATA_MODE/,
  );
});

test("Netlify owns /api/academy through academy config only", async () => {
  const [netlify, academy, entries] = await Promise.all([
    readFile("netlify.toml", "utf8"),
    readFile("netlify/functions/academy.ts", "utf8"),
    readdir("netlify/functions"),
  ]);
  assert.deepEqual(entries.sort(), ["academy.ts"]);
  assert.match(academy, /export const config = \{ path: "\/api\/academy" \}/);
  assert.doesNotMatch(netlify, /from\s*=\s*"\/api\/academy"/);
  assert.doesNotMatch(netlify, /to\s*=\s*"\/\.netlify\/functions\/academy"/);
  const api = netlify.indexOf("/api/academy");
  const spa = netlify.indexOf('to = "/index.html"');
  assert.ok(api === -1 || spa === -1 || api < spa, "SPA fallback must not shadow API");
});

test("CSP scopes Firebase popup inline scripts to script elements", async () => {
  const netlify = await readFile("netlify.toml", "utf8");
  const csp = /Content-Security-Policy = "([^"]+)"/.exec(netlify)?.[1];
  assert.ok(csp, "CSP missing");
  const script = /(?:^|; )script-src ([^;]+)/.exec(csp)?.[1];
  assert.equal(script, "'self' https://apis.google.com");
  assert.doesNotMatch(script, /unsafe-inline/);
  assert.match(csp, /script-src-elem 'self' 'unsafe-inline' https:\/\/apis\.google\.com/);
  assert.match(csp, /script-src-attr 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'self'/);
  assert.match(csp, /connect-src[^;]*identitytoolkit\.googleapis\.com[^;]*securetoken\.googleapis\.com/);
  assert.match(csp, /frame-src[^;]*firebaseapp\.com[^;]*accounts\.google\.com/);
});
