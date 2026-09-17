export const categories = [
  "Web",
  "Crypto",
  "Pwn",
  "Forensics",
  "Reversing",
  "Misc",
] as const;
export const difficulties = ["Easy", "Medium", "Hard", "Insane"] as const;
export type Category = (typeof categories)[number];
export type Difficulty = (typeof difficulties)[number];
export interface Player {
  uid: string;
  displayName: string;
  username: string;
  points: number;
  solves: number;
  firstBloods: number;
  rank?: number;
}
export interface Profile extends Player {
  email: string;
  role: "student" | "admin";
  suspended: boolean;
  createdAt?: number;
}
export interface Challenge {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  points: number;
  authorName: string;
  published: boolean;
  solveCount: number;
  createdAt: number;
  files: { name: string; url: string }[];
  hints: { text: string; cost?: number }[];
}
export interface ChallengeDraft extends Challenge {
  flag: string;
  caseInsensitive: boolean;
}
export interface Solve {
  id: string;
  uid: string;
  challengeId: string;
  challengeName: string;
  category: Category;
  difficulty: Difficulty;
  points: number;
  playerName: string;
  solvedAt: number;
  isFirstBlood: boolean;
}
export interface Session {
  user: { uid: string; email: string | null; displayName: string | null } | null;
  profile: Profile | null;
  loading: boolean;
  error: string;
  maintenance: boolean;
}
export interface FlagResult {
  outcome: "correct" | "incorrect" | "alreadySolved";
  points: number;
  attempts: number;
  firstBlood: boolean;
}
export interface Board {
  players: Player[];
  me: Player | null;
}
export interface Settings {
  platformName: string;
  events: number;
}
export interface Stats {
  challenges: number;
  players: number;
  solves: number;
  events: number;
}
export interface Repair {
  digest: string;
  writes: number;
  users?: number;
  solves?: number;
  applied?: boolean;
  changes?: { path: string; values: Record<string, unknown> }[];
  processed: number;
  repaired: number;
  remaining: number;
  hasMore: boolean;
  continuation: string | null;
  phase: "scan" | "ready" | "solves" | "challenges" | "users" | "complete";
}
export interface Page<T> {
  items: T[];
  cursor: string | null;
}
export interface Academy {
  watchSession(callback: (session: Session) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  saveProfile(displayName: string, username: string): Promise<void>;
  catalog(admin?: boolean): Promise<Challenge[]>;
  challenge(id: string): Promise<Challenge | null>;
  progress(uid: string): Promise<Solve[]>;
  history(uid: string, cursor?: string): Promise<Page<Solve>>;
  detail(
    uid: string,
    id: string,
  ): Promise<{ solve: Solve | null; attempts: number; solvers: Solve[] }>;
  submit(id: string, flag: string, requestId: string): Promise<FlagResult>;
  leaderboard(): Promise<Board>;
  stats(): Promise<Stats>;
  students(cursor?: string): Promise<Page<Profile>>;
  adminChallenge(
    action: "read" | "save" | "publish" | "delete",
    id?: string,
    challenge?: ChallengeDraft,
    published?: boolean,
  ): Promise<ChallengeDraft | { id: string }>;
  account(
    uid: string,
    action: "role" | "suspend" | "reinstate",
    role?: "admin" | "student",
  ): Promise<void>;
  settings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  maintenance(enabled: boolean): Promise<void>;
  reconcile(apply?: boolean, digest?: string, token?: string): Promise<Repair>;
}
