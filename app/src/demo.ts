import type {
  Academy,
  Challenge,
  ChallengeDraft,
  Profile,
  Session,
  Solve,
  Settings,
} from "./types";
const now = Date.UTC(2026, 7, 1);
const specs = [
  [
    "cookie-monster",
    "Cookie Monster",
    "Web",
    "Easy",
    100,
    "The browser remembers more than you think. Inspect a cookie and discover where trust begins.",
  ],
  [
    "quiet-signals",
    "Quiet Signals",
    "Crypto",
    "Easy",
    100,
    "A message arrived without its key. Look for repetition, then let the pattern guide you.",
  ],
  [
    "hidden-in-plain-sight",
    "Hidden in Plain Sight",
    "Forensics",
    "Medium",
    250,
    "An ordinary image carries an unusual story. Read its metadata and follow the evidence.",
  ],
  [
    "broken-rsa",
    "Broken RSA",
    "Crypto",
    "Hard",
    400,
    "Two public keys share more than their author intended. Examine the relationship between them.",
  ],
  [
    "stack-notes",
    "Stack Notes",
    "Pwn",
    "Medium",
    300,
    "Trace how a small program stores input. Find the boundary between data and control.",
  ],
  [
    "the-other-branch",
    "The Other Branch",
    "Reversing",
    "Hard",
    400,
    "A program checks a phrase. Follow its decisions and reconstruct the path it expects.",
  ],
  [
    "first-observation",
    "First Observation",
    "Misc",
    "Easy",
    50,
    "Practice the full challenge workflow. The preview flag is FLAG{observe}. Submit it to record your first finding.",
  ],
] as const;
let challenges: Challenge[] = specs.map(
  ([id, title, category, difficulty, points, description], i) => ({
    id,
    title,
    category,
    difficulty,
    points,
    description,
    authorName: "FlagForge faculty",
    published: true,
    solveCount: 0,
    createdAt: now + i * 86400000,
    files: [],
    hints: [
      {
        text: "This is a local practice preview. Try FLAG{observe} to explore the solved state.",
        cost: 0,
      },
    ],
  }),
);
const profiles: Profile[] = [
  {
    uid: "preview",
    displayName: "Alex Morgan",
    username: "alex",
    email: "alex@example.test",
    role: "student",
    suspended: false,
    points: 0,
    solves: 0,
    firstBloods: 0,
  },
  {
    uid: "instructor",
    displayName: "Sam Chen",
    username: "sam",
    email: "sam@example.test",
    role: "admin",
    suspended: false,
    points: 0,
    solves: 0,
    firstBloods: 0,
  },
];
let userId = sessionStorage.getItem("flagforge.preview.user") || "";
let maintenance = false;
let settings: Settings = { platformName: "FlagForge", events: 0 };
const solves: Solve[] = [],
  attempts = new Map<string, number>(),
  responses = new Map<string, Awaited<ReturnType<Academy["submit"]>>>();
const listeners = new Set<(s: Session) => void>();
function session(): Session {
  const profile = profiles.find((p) => p.uid === userId) || null;
  return {
    user: profile ? { uid: profile.uid, email: profile.email } : null,
    profile,
    loading: false,
    error: "",
    maintenance,
  };
}
function emit() {
  listeners.forEach((fn) => fn(session()));
}
function me() {
  const p = session().profile;
  if (!p) throw new Error("Sign in to the preview first.");
  if (p.suspended) throw new Error("Your access is suspended.");
  return p;
}
function admin() {
  if (me().role !== "admin")
    throw new Error("Administrator access is required.");
}
export const demo: Academy = {
  watchSession(fn) {
    listeners.add(fn);
    fn(session());
    return () => listeners.delete(fn);
  },
  async signIn(email) {
    userId = email.startsWith("instructor") ? "instructor" : "preview";
    sessionStorage.setItem("flagforge.preview.user", userId);
    emit();
  },
  async register(email) {
    userId = "preview";
    profiles[0].email = email;
    sessionStorage.setItem("flagforge.preview.user", userId);
    emit();
  },
  async signOut() {
    userId = "";
    sessionStorage.removeItem("flagforge.preview.user");
    emit();
  },
  async resetPassword() {},
  async changePassword() {},
  async saveProfile(displayName, username) {
    Object.assign(me(), { displayName, username });
    emit();
  },
  async catalog(isAdmin) {
    return structuredClone(challenges.filter((c) => isAdmin || c.published));
  },
  async challenge(id) {
    return structuredClone(
      challenges.find((c) => c.id === id && c.published) || null,
    );
  },
  async progress(uid) {
    return structuredClone(solves.filter((s) => s.uid === uid));
  },
  async history(uid) {
    return {
      items: structuredClone(
        solves
          .filter((s) => s.uid === uid)
          .sort((a, b) => b.solvedAt - a.solvedAt),
      ),
      cursor: null,
    };
  },
  async detail(uid, id) {
    return {
      solve: solves.find((s) => s.uid === uid && s.challengeId === id) || null,
      attempts: attempts.get(`${uid}_${id}`) || 0,
      solvers: solves.filter((s) => s.challengeId === id).slice(0, 5),
    };
  },
  async submit(id, flag, requestId) {
    const p = me(),
      c = challenges.find((c) => c.id === id && c.published);
    if (!c || maintenance) throw new Error("Challenge unavailable.");
    if (responses.has(requestId)) return responses.get(requestId)!;
    const key = `${p.uid}_${id}`,
      old = solves.find((s) => s.id === key);
    if (old)
      return {
        outcome: "alreadySolved",
        points: old.points,
        attempts: attempts.get(key) || 0,
        firstBlood: old.isFirstBlood,
      };
    const count = (attempts.get(key) || 0) + 1;
    attempts.set(key, count);
    const correct = flag.trim() === "FLAG{observe}",
      firstBlood = correct && c.solveCount === 0;
    if (correct) {
      solves.push({
        id: key,
        uid: p.uid,
        challengeId: id,
        challengeName: c.title,
        category: c.category,
        difficulty: c.difficulty,
        points: c.points,
        playerName: p.displayName,
        solvedAt: Date.now(),
        isFirstBlood: firstBlood,
      });
      p.points += c.points;
      p.solves++;
      p.firstBloods += Number(firstBlood);
      c.solveCount++;
      emit();
    }
    const result = {
      outcome: correct ? ("correct" as const) : ("incorrect" as const),
      points: correct ? c.points : 0,
      attempts: count,
      firstBlood,
    };
    responses.set(requestId, result);
    return result;
  },
  async leaderboard() {
    const players = profiles
      .map((p) => ({ ...p }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.solves - a.solves ||
          b.firstBloods - a.firstBloods ||
          a.displayName.localeCompare(b.displayName, "en") ||
          a.uid.localeCompare(b.uid),
      )
      .map((p, i) => ({ ...p, rank: i + 1 }));
    return { players, me: players.find((p) => p.uid === userId) || null };
  },
  async stats() {
    return {
      challenges: challenges.filter((c) => c.published).length,
      players: profiles.length,
      solves: solves.length,
      events: settings.events,
    };
  },
  async students() {
    admin();
    return { items: structuredClone(profiles), cursor: null };
  },
  async adminChallenge(action, id, challenge, published) {
    admin();
    const c = challenges.find((c) => c.id === id);
    if (action === "read") {
      if (!c) throw new Error("Challenge not found.");
      return { ...c, flag: "FLAG{observe}", caseInsensitive: false };
    }
    if (action === "delete") challenges = challenges.filter((c) => c.id !== id);
    if (action === "publish" && c) c.published = !!published;
    if (action === "save" && challenge) {
      const next = {
        ...challenge,
        id: id || crypto.randomUUID(),
        createdAt: c?.createdAt || Date.now(),
        solveCount: c?.solveCount || 0,
      };
      challenges = challenges.filter((c) => c.id !== id);
      challenges.push(next);
      return { id: next.id };
    }
    return { id: id! };
  },
  async account(uid, action, role) {
    admin();
    if (uid === userId)
      throw new Error("Ask another administrator to change your access.");
    const p = profiles.find((p) => p.uid === uid)!;
    if (action === "role") p.role = role || "student";
    else p.suspended = action === "suspend";
    emit();
  },
  async settings() {
    admin();
    return { ...settings };
  },
  async saveSettings(next) {
    admin();
    settings = next;
  },
  async maintenance(enabled) {
    admin();
    maintenance = enabled;
    emit();
  },
  async reconcile(apply) {
    admin();
    if (!maintenance) throw new Error("Enable maintenance first.");
    return {
      digest: "preview",
      writes: 0,
      users: profiles.length,
      solves: solves.length,
      applied: !!apply,
      processed: solves.length,
      repaired: 0,
      remaining: 0,
      hasMore: false,
      continuation: null,
      phase: "complete",
    };
  },
};
