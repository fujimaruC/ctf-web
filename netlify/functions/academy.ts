import { createAcademy, ApiError } from "../../server/academy.js";
import { admin } from "./admin.js";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
const status = (code: string) => ({
  "invalid-argument": 400, unauthenticated: 401, "permission-denied": 403,
  "not-found": 404, "already-exists": 409, aborted: 409,
  "failed-precondition": 412, "resource-exhausted": 429, unavailable: 503,
}[code] || 500);
async function identity(request: Request) {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer ([^\s]+)$/.exec(header);
  if (!match) throw new ApiError("unauthenticated", "Sign in to continue.");
  try {
    return (await admin().auth.verifyIdToken(match[1])).uid;
  } catch {
    throw new ApiError("unauthenticated", "Sign in to continue.");
  }
}
export default async function academy(request: Request): Promise<Response> {
  if (request.method !== "POST") return json({ error: { code: "method-not-allowed", message: "Use POST." } }, 405);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 16_384) return json({ error: { code: "payload-too-large", message: "Request is too large." } }, 413);
  try {
    const raw = await request.text();
    if (raw.length > 16_384) throw new ApiError("invalid-argument", "Request is too large.");
    const body = JSON.parse(raw || "{}") as { action?: unknown; data?: unknown };
    const uid = await identity(request);
    const services = admin();
    const call = createAcademy(services.db, services.auth);
    return json({ data: await call(body.action, uid, body.data ?? {}) });
  } catch (error) {
    if (error instanceof ApiError) return json({ error: { code: error.code, message: error.message } }, status(error.code));
    if (error instanceof SyntaxError) return json({ error: { code: "invalid-argument", message: "Invalid JSON." } }, 400);
    console.error("academy request failed", error instanceof Error ? error.message : "unknown error");
    return json({ error: { code: "internal", message: "The request could not be completed." } }, 500);
  }
}
export const config = { path: "/api/academy" };
