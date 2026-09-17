import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  connectAuthEmulator,
} from "firebase/auth";
import type {
  QueryConstraint,
  DocumentSnapshot,
  Timestamp,
} from "firebase/firestore";
import type {
  Academy,
  Profile,
  Challenge,
  ChallengeDraft,
  Solve,
  Session,
  Board,
  Stats,
  Settings,
  Repair,
  FlagResult,
} from "./types";
import { errorMessage } from "./data";
const env = import.meta.env;
if (
  !env.VITE_FIREBASE_API_KEY ||
  !env.VITE_FIREBASE_PROJECT_ID ||
  !env.VITE_FIREBASE_AUTH_DOMAIN ||
  !env.VITE_FIREBASE_APP_ID
)
  throw new Error(
    "Firebase is not configured. Contact the academy administrator.",
  );
const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  appId: env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
if (env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
}
let storePromise: ReturnType<typeof loadStore> | undefined;
let TimestampClass: typeof Timestamp;
function store() {
  return (storePromise ||= loadStore());
}
function loadStore() {
  return import("firebase/firestore").then((sdk) => {
    const db = sdk.getFirestore(app);
    TimestampClass = sdk.Timestamp;
    if (env.VITE_USE_EMULATORS === "true")
      sdk.connectFirestoreEmulator(db, "127.0.0.1", 8080);
    return {
      db,
      collection: sdk.collection,
      doc: sdk.doc,
      getDoc: sdk.getDoc,
      getDocs: sdk.getDocs,
      query: sdk.query,
      where: sdk.where,
      orderBy: sdk.orderBy,
      limit: sdk.limit,
      startAfter: sdk.startAfter,
      onSnapshot: sdk.onSnapshot,
    };
  });
}
function convert(value: unknown): any {
  if (TimestampClass && value instanceof TimestampClass)
    return value.toMillis();
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, convert(v)]),
    );
  return value;
}
function record<T>(s: DocumentSnapshot): T {
  return { id: s.id, ...convert(s.data()) } as T;
}
async function call<T>(name: string, data: unknown = {}): Promise<T> {
  const user = auth.currentUser;
  const response = await fetch("/api/academy", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(user ? { authorization: `Bearer ${await user.getIdToken()}` } : {}),
    },
    body: JSON.stringify({ action: name, data }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = payload.error || { code: "unavailable", message: "Try again shortly." };
    throw Object.assign(new Error(error.message), { code: `academy/${error.code}` });
  }
  return payload.data as T;
}
async function list<T>(name: string, constraints: QueryConstraint[]) {
  const { db, getDocs, query, collection } = await store();
  return (await getDocs(query(collection(db, name), ...constraints))).docs.map(
    (s) => record<T>(s),
  );
}
async function page<T>(
  name: string,
  constraints: QueryConstraint[],
  cursor?: string,
) {
  const { db, getDoc, doc, getDocs, query, collection, startAfter, limit } =
    await store();
  const last = cursor ? await getDoc(doc(db, name, cursor)) : null;
  const docs = await getDocs(
    query(
      collection(db, name),
      ...constraints,
      ...(last?.exists() ? [startAfter(last)] : []),
      limit(50),
    ),
  );
  return {
    items: docs.docs.map((s) => record<T>(s)),
    cursor: docs.size === 50 ? docs.docs.at(-1)!.id : null,
  };
}
export const firebase: Academy = {
  watchSession(callback) {
    let stopProfile = () => {},
      stopControl = () => {};
    let state: Session = {
      user: null,
      profile: null,
      loading: true,
      error: "",
      maintenance: false,
    };
    const fail = (e: unknown) => {
      state = { ...state, loading: false, error: errorMessage(e) };
      callback(state);
    };
    let generation = 0;
    const stop = onAuthStateChanged(
      auth,
      async (user) => {
        const current = ++generation;
        stopProfile();
        stopControl();
        state = {
          user: user ? { uid: user.uid, email: user.email } : null,
          profile: null,
          loading: !!user,
          error: "",
          maintenance: false,
        };
        callback(state);
        if (user) {
          try {
            const { db, onSnapshot, doc } = await store();
            if (generation !== current) return;
            stopProfile = onSnapshot(
              doc(db, "users", user.uid),
              (s) => {
                state = {
                  ...state,
                  profile: s.exists() ? record<Profile>(s) : null,
                  loading: false,
                  error: "",
                };
                callback(state);
              },
              fail,
            );
            stopControl = onSnapshot(
              doc(db, "meta", "control"),
              (s) => {
                state = { ...state, maintenance: !!s.data()?.maintenance };
                callback(state);
              },
              fail,
            );
          } catch (error) {
            if (generation === current) fail(error);
          }
        }
      },
      fail,
    );
    return () => {
      generation++;
      stop();
      stopProfile();
      stopControl();
    };
  },
  async signIn(email, password) {
    await signInWithEmailAndPassword(auth, email, password);
  },
  async register(email, password) {
    await createUserWithEmailAndPassword(auth, email, password);
  },
  async signOut() {
    await signOut(auth);
  },
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      if ((error as { code?: string }).code !== "auth/user-not-found")
        throw error;
    }
  },
  async changePassword(current, next) {
    if (!auth.currentUser?.email) throw new Error("Sign in again.");
    await reauthenticateWithCredential(
      auth.currentUser,
      EmailAuthProvider.credential(auth.currentUser.email, current),
    );
    await updatePassword(auth.currentUser, next);
  },
  async saveProfile(displayName, username) {
    await call("saveProfile", { displayName, username });
  },
  async catalog(admin = false) {
    const { where, limit } = await store();
    const all = await list<Challenge>("challenges", [
      ...(admin ? [] : [where("published", "==", true)]),
      limit(501),
    ]);
    if (all.length > 500)
      throw new Error(
        "Catalog exceeds supported capacity. Contact your instructor.",
      );
    return all;
  },
  async challenge(id) {
    const { db, getDoc, doc } = await store();
    const s = await getDoc(doc(db, "challenges", id));
    return s.exists() ? record<Challenge>(s) : null;
  },
  async progress(uid) {
    const { where, limit } = await store();
    const all = await list<Solve>("solves", [
      where("uid", "==", uid),
      limit(5001),
    ]);
    if (all.length > 5000)
      throw new Error("History needs an administrator review.");
    return all;
  },
  async history(uid, cursor) {
    const { where, orderBy } = await store();
    return page<Solve>(
      "solves",
      [where("uid", "==", uid), orderBy("solvedAt", "desc")],
      cursor,
    );
  },
  async detail(uid, id) {
    const { db, getDoc, doc, where, orderBy, limit } = await store();
    const [s, a, solvers] = await Promise.all([
      getDoc(doc(db, "solves", `${uid}_${id}`)),
      getDoc(doc(db, "attempts", `${uid}_${id}`)),
      list<Solve>("solves", [
        where("challengeId", "==", id),
        orderBy("solvedAt", "asc"),
        limit(5),
      ]),
    ]);
    return {
      solve: s.exists() ? record<Solve>(s) : null,
      attempts: a.data()?.count || 0,
      solvers,
    };
  },
  submit(challengeId, flag, requestId) {
    return call<FlagResult>("submitFlag", { challengeId, flag, requestId });
  },
  leaderboard() {
    return call<Board>("getLeaderboard");
  },
  stats() {
    return call<Stats>("publicStats");
  },
  async students(cursor) {
    const { orderBy } = await store();
    return page<Profile>("users", [orderBy("createdAt", "desc")], cursor);
  },
  adminChallenge(action, id, challenge, published) {
    return call<ChallengeDraft | { id: string }>("adminChallenge", {
      action,
      ...(id ? { id } : {}),
      ...(challenge ? { challenge } : {}),
      ...(published !== undefined ? { published } : {}),
    });
  },
  async account(uid, action, role) {
    await call("adminAccount", { uid, action, ...(role ? { role } : {}) });
  },
  async settings() {
    const { db, getDoc, doc } = await store();
    const s = await getDoc(doc(db, "meta", "settings"));
    return s.exists()
      ? (s.data() as Settings)
      : { platformName: "FlagForge", events: 0 };
  },
  async saveSettings(settings) {
    await call("adminSettings", settings);
  },
  async maintenance(enabled) {
    await call("maintenance", { enabled });
  },
  reconcile(apply = false, digest, token) {
    return call<Repair>("reconcile", {
      apply,
      ...(digest ? { digest } : {}),
      ...(token ? { token } : {}),
    });
  },
};
