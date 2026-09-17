export const categories = [
  "Web",
  "Crypto",
  "Pwn",
  "Forensics",
  "Reversing",
  "Misc",
] as const;
export const difficulties = ["Easy", "Medium", "Hard", "Insane"] as const;
export function text(value: unknown, name: string, max = 100, min = 1): string {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new Error(`${name} must contain ${min}–${max} characters.`);
  return value.trim();
}
export function username(value: unknown) {
  const result = text(value, "Username", 20, 3).toLowerCase();
  if (!/^[a-z0-9_]+$/.test(result))
    throw new Error("Use letters, numbers, and underscores for your username.");
  return result;
}
export function safeUrl(value: unknown) {
  const url = new URL(text(value, "URL", 2048));
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Use an HTTP or HTTPS URL without credentials.");
  return url.href;
}
export function flagMatches(
  input: string,
  expected: string,
  insensitive = false,
) {
  return insensitive
    ? input.trim().toLowerCase() === expected.trim().toLowerCase()
    : input.trim() === expected.trim();
}
export function comparePlayers(a: Record<string, any>, b: Record<string, any>) {
  return (
    (b.points || 0) - (a.points || 0) ||
    (b.solves || 0) - (a.solves || 0) ||
    (b.firstBloods || 0) - (a.firstBloods || 0) ||
    String(a.displayName || "").localeCompare(
      String(b.displayName || ""),
      "en",
    ) ||
    String(a.uid).localeCompare(String(b.uid))
  );
}
export function challengeInput(input: Record<string, any>) {
  const title = text(input.title, "Title", 100, 3);
  if (
    !categories.includes(input.category) ||
    !difficulties.includes(input.difficulty)
  )
    throw new Error("Choose a valid category and difficulty.");
  if (
    !Number.isInteger(input.points) ||
    input.points < 1 ||
    input.points > 10000
  )
    throw new Error("Points must be a whole number from 1 to 10,000.");
  if (
    typeof input.published !== "boolean" ||
    typeof input.caseInsensitive !== "boolean"
  )
    throw new Error("Invalid challenge settings.");
  if (
    !Array.isArray(input.files) ||
    input.files.length > 20 ||
    !Array.isArray(input.hints) ||
    input.hints.length > 20
  )
    throw new Error("Use at most 20 files and hints.");
  return {
    title,
    category: input.category,
    difficulty: input.difficulty,
    points: input.points,
    description: text(input.description, "Description", 5000, 10),
    authorName: text(input.authorName, "Author", 100),
    published: input.published,
    files: input.files.map((f: any) => ({
      name: text(f.name, "File name", 100),
      url: safeUrl(f.url),
    })),
    hints: input.hints.map((h: any) => ({
      text: text(h.text, "Hint", 2000),
      cost: 0,
    })),
  };
}
