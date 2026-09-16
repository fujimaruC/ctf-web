import type { Academy } from "./types";
export const preview = import.meta.env.VITE_DATA_MODE !== "firebase";
export const academy: Promise<Academy> = preview
  ? import("./demo").then((m) => m.demo)
  : import("./firebase").then((m) => m.firebase);
export function errorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (e.code?.startsWith("auth/")) {
    if (e.code === "auth/network-request-failed")
      return "Connection failed. Your input is safe. Check your connection and try again.";
    if (e.code === "auth/too-many-requests")
      return "Too many attempts. Wait a few minutes and try again.";
    if (e.code === "auth/email-already-in-use")
      return "Could not create this account. Try signing in or resetting your password.";
    return "Could not verify your credentials. Check your email and password, then try again.";
  }
  if (e.code === "permission-denied")
    return "You no longer have access. Sign in again or contact your instructor.";
  if (e.code === "unavailable")
    return "Connection unavailable. Check your connection and retry.";
  if (e.code === "failed-precondition")
    return "This view is not ready. Please contact your instructor.";
  return e.code?.startsWith("functions/") && e.code !== "functions/internal"
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
