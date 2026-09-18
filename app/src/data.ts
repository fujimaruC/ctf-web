import type { Academy } from "./types";
const mode = import.meta.env.VITE_DATA_MODE;
if (mode !== "demo" && mode !== "firebase")
  throw new Error(
    "VITE_DATA_MODE must be exactly demo or firebase. Refusing to select sample data implicitly.",
  );
export const preview = mode === "demo";
export const academy: Promise<Academy> = preview
  ? import("./demo").then((m) => m.demo)
  : import("./firebase").then((m) => m.firebase);
export function errorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e.code?.startsWith("auth/")) {
    if (import.meta.env.DEV)
      return `Google sign-in failed (${e.code}). ${e.message || "Check browser console."}`;
    if (e.code === "auth/network-request-failed")
      return "Connection failed. Your input is safe. Check your connection and try again.";
    if (e.code === "auth/too-many-requests")
      return "Too many attempts. Wait a few minutes and try again.";
    if (e.code === "auth/popup-closed-by-user")
      return "Google sign-in was cancelled. Try again when you’re ready.";
    if (
      e.code === "auth/unauthorized-domain" ||
      e.code === "auth/operation-not-allowed" ||
      e.code === "auth/invalid-api-key"
    )
      return "Google sign-in is not configured for this site. Contact the academy administrator.";
    return "Google could not complete sign-in. Check your connection and try again.";
  }
  if (e.code === "permission-denied")
    return "You no longer have access. Sign in again or contact your instructor.";
  if (e.code === "unavailable")
    return "Connection unavailable. Check your connection and retry.";
  if (e.code === "failed-precondition")
    return "This view is not ready. Please contact your instructor.";
  return (e.code?.startsWith("functions/") || e.code?.startsWith("academy/")) &&
    e.code !== "functions/internal" && e.code !== "academy/internal"
    ? e.message || "The request could not finish. Retry."
    : error instanceof Error && !e.code
      ? error.message
      : "The request could not finish. Your input is safe. Please retry.";
}
export function date(value: number) {
  return value
    ? new Date(value).toLocaleDateString("en", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Date unavailable";
}
export function safeLink(url: string) {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : undefined;
  } catch {
    return undefined;
  }
}
export function csv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map((value) => {
          let s = String(value ?? "");
          if (/^[\s]*[=+@\-\t\r\n]/.test(s)) s = "'" + s;
          return '"' + s.replaceAll('"', '""') + '"';
        })
        .join(","),
    )
    .join("\r\n");
}
export function downloadCsv(name: string, rows: unknown[][]) {
  const url = URL.createObjectURL(
    new Blob(["\uFEFF", csv(rows)], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
