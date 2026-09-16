/** Explicit, maintenance-only migration. Dry-run is the default. Never prints flags. */
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [key, ...rest] = a.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  }),
);
if (!args.project || args.project === true)
  throw new Error("Specify --project=PROJECT. Dry-run is the default.");
const app = initializeApp({ projectId: args.project });
const db = getFirestore(app);
const names = [
  "users",
  "usernames",
  "challenges",
  "solves",
  "attempts",
  "meta",
  "players",
  "challengeSecrets",
];
const snapshot = {};
for (const name of names)
  snapshot[name] = (await db.collection(name).get()).docs;
function encode(value) {
  if (value instanceof Timestamp)
    return { __timestamp: [value.seconds, value.nanoseconds] };
  if (Array.isArray(value)) return value.map(encode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, encode(v)]),
    );
  return value;
}
const backup = Object.fromEntries(
  names.map((name) => [
    name,
    snapshot[name].map((d) => ({ id: d.id, data: encode(d.data()) })),
  ]),
);
const digest = createHash("sha256")
  .update(JSON.stringify(backup))
  .digest("hex");
const issues = [],
  handles = new Map(),
  updates = [];
if (snapshot.users.length > 2000 || snapshot.challenges.length > 500)
  issues.push("Dataset exceeds the approved capacity.");
for (const user of snapshot.users) {
  const p = user.data(),
    handle = String(p.username || "").toLowerCase();
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
    issues.push(`users/${user.id}: username needs review`);
    continue;
  }
  if (handles.has(handle) && handles.get(handle) !== user.id)
    issues.push(`Duplicate username: ${handle}`);
  handles.set(handle, user.id);
  if (!["student", "admin"].includes(p.role) || !p.displayName || !p.createdAt)
    issues.push(`users/${user.id}: profile schema needs review`);
  for (const field of ["points", "solves", "firstBloods"])
    if (
      p[field] !== undefined &&
      (!Number.isSafeInteger(p[field]) || p[field] < 0)
    )
      issues.push(`users/${user.id}: ${field} needs review`);
  updates.push({
    path: user.ref.path,
    data: {
      uid: user.id,
      suspended: p.suspended === true,
      firstBloods: p.firstBloods || 0,
    },
  });
  updates.push({
    path: `players/${user.id}`,
    replace: true,
    data: {
      uid: user.id,
      displayName: p.displayName || "",
      username: p.username,
      points: p.points || 0,
      solves: p.solves || 0,
      firstBloods: p.firstBloods || 0,
    },
  });
  updates.push({
    path: `usernames/${handle}`,
    replace: true,
    data: { uid: user.id },
  });
}
for (const slot of snapshot.usernames) {
  if (handles.has(slot.id) && handles.get(slot.id) !== slot.get("uid"))
    issues.push(`usernames/${slot.id}: reservation conflicts with profile`);
}
for (const ch of snapshot.challenges) {
  const c = ch.data(),
    secret = snapshot.challengeSecrets.find((s) => s.id === ch.id);
  if (typeof c.flag === "string" && c.flag.trim()) {
    updates.push({
      path: `challengeSecrets/${ch.id}`,
      replace: true,
      data: { flag: c.flag.trim(), caseInsensitive: !!c.caseInsensitive },
    });
    updates.push({
      path: ch.ref.path,
      data: { flag: FieldValue.delete(), caseInsensitive: FieldValue.delete() },
    });
  } else if (!secret?.get("flag"))
    issues.push(`challenges/${ch.id}: no private flag available`);
  if (!Number.isInteger(c.points) || c.points < 1 || c.points > 10000)
    issues.push(`challenges/${ch.id}: points need review`);
}
for (const solve of snapshot.solves) {
  const s = solve.data();
  if (
    !s.uid ||
    !s.challengeId ||
    !s.solvedAt ||
    !Number.isSafeInteger(s.points) ||
    s.points < 0
  )
    issues.push(`solves/${solve.id}: historical award needs review`);
}
const totals = new Map();
for (const s of snapshot.solves) {
  const uid = s.get("uid"),
    t = totals.get(uid) || { points: 0, solves: 0, firstBloods: 0 };
  t.points += s.get("points") || 0;
  t.solves++;
  t.firstBloods += Number(!!s.get("isFirstBlood"));
  totals.set(uid, t);
}
for (const u of snapshot.users) {
  const total = totals.get(u.id) || { points: 0, solves: 0, firstBloods: 0 };
  for (const key of Object.keys(total))
    if ((u.get(key) || 0) !== total[key])
      issues.push(
        `users/${u.id}: ${key} differs from solve history; review before migration`,
      );
}
const report = {
  project: args.project,
  digest,
  counts: Object.fromEntries(names.map((n) => [n, snapshot[n].length])),
  plannedWrites: updates.length,
  issues,
};
console.log(JSON.stringify(report, null, 2));
if (!args.apply) process.exit(issues.length ? 2 : 0);
if (args["confirm-project"] !== args.project || args.digest !== digest)
  throw new Error(
    "Apply requires --confirm-project=PROJECT and the exact --digest from a fresh dry-run.",
  );
if (issues.length)
  throw new Error("Resolve the reported issues before applying.");
if (!(await db.doc("meta/control").get()).get("maintenance"))
  throw new Error("Enable maintenance and stop legacy writes before applying.");
const directory = resolve("artifacts/migration");
await mkdir(directory, { recursive: true });
const backupFile = resolve(
  directory,
  `${args.project}-${Date.now()}-private-backup.json`,
);
await writeFile(
  backupFile,
  JSON.stringify({ project: args.project, digest, collections: backup }),
  { mode: 0o600, flag: "wx" },
);
for (let i = 0; i < updates.length; i += 400) {
  await db.runTransaction(async (t) => {
    const state = await t.get(db.doc("meta/control"));
    if (!state.get("maintenance"))
      throw new Error("Maintenance ended. Stop and review the backup.");
    for (const change of updates.slice(i, i + 400))
      t.set(db.doc(change.path), change.data, { merge: !change.replace });
    t.set(
      db.doc("meta/migration"),
      {
        digest,
        checkpoint: i + Math.min(400, updates.length - i),
        at: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  });
}
console.log(
  `Migration applied. Private backup: ${backupFile}. Maintenance remains enabled. Verify counts and access rules before reopening.`,
);
