const base = process.argv[2] || process.env.FLAGFORGE_SMOKE_URL;
if (!base) throw new Error("Pass deployment URL: npm run smoke:deploy -- https://example.netlify.app");
const origin = new URL(base).origin;
const badHtml = /<!doctype html|<html|index\.html|404\.html|This page is outside the map/i;
async function api(method, body, status, code) {
  const response = await fetch(new URL("/api/academy", origin), {
    method, headers: body ? { "content-type": "application/json" } : {},
    body: body && JSON.stringify(body),
  });
  const text = await response.text();
  if (response.status !== status) throw new Error(`${method} /api/academy returned ${response.status}, expected ${status}.`);
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error(`${method} /api/academy did not return JSON.`);
  if (badHtml.test(text)) throw new Error(`${method} /api/academy returned FlagForge HTML.`);
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${method} /api/academy returned invalid JSON.`); }
  if (json?.error?.code !== code) throw new Error(`${method} /api/academy returned unexpected error.`);
}
await api("GET", null, 405, "method-not-allowed");
await api("POST", { action: "submitFlag", data: {} }, 401, "unauthenticated");
const missing = await fetch(new URL("/__flagforge-smoke-missing__", origin));
const html = await missing.text();
if (missing.status !== 404 || !missing.headers.get("content-type")?.includes("text/html") || !/<html/i.test(html))
  throw new Error("Unknown page did not return HTML 404.");
console.log("Deployment smoke checks passed.");
