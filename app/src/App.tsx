import {
  lazy,
  Suspense,
  useEffect,
  useState,
  useRef,
  Component,
  type ReactNode,
} from "react";
import {
  Routes,
  Route,
  NavLink,
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import { academy, preview } from "./data";
import {
  SessionProvider,
  useSession,
  RouteFocus,
  useMotion,
  Heading,
  useAction,
  Feedback,
} from "./ui";
const Landing = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.Landing })),
);
const Information = lazy(() =>
  import("./pages/Public").then((m) => ({ default: m.Information })),
);
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() =>
  import("./pages/Learner").then((m) => ({ default: m.Dashboard })),
);
const Catalog = lazy(() =>
  import("./pages/Learner").then((m) => ({ default: m.Catalog })),
);
const Challenge = lazy(() =>
  import("./pages/Learner").then((m) => ({ default: m.ChallengePage })),
);
const Leaderboard = lazy(() =>
  import("./pages/Learner").then((m) => ({ default: m.Leaderboard })),
);
const Profile = lazy(() => import("./pages/Profile"));
const Admin = lazy(() => import("./pages/Admin"));

class Boundary extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <main className="page">
        <Heading
          title="This page could not open"
          description="Reload to try again. If the problem continues, contact your instructor."
        />
        <button onClick={() => window.location.reload()}>Reload</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export function Brand() {
  return (
    <Link to="/" className="brand" aria-label="FlagForge home">
      <span className="brand-mark" aria-hidden="true">
        f<span>f</span>
      </span>
      <span>
        FlagForge<small>CYBERSECURITY ACADEMY</small>
      </span>
    </Link>
  );
}
function Theme() {
  const [choice, setChoice] = useState(
    () => localStorage.getItem("flagforge.theme") || "system",
  );
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme =
        choice === "system" ? (media.matches ? "dark" : "light") : choice;
    };
    apply();
    localStorage.setItem("flagforge.theme", choice);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [choice]);
  return (
    <label className="theme">
      Theme
      <select
        aria-label="Theme"
        value={choice}
        onChange={(e) => setChoice(e.target.value)}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
function Shell() {
  const session = useSession(),
    location = useLocation();
  const [menu, setMenu] = useState(false),
    [online, setOnline] = useState(navigator.onLine);
  const action = useAction();
  const ref = useRef<HTMLElement>(null);
  useMotion(ref, location.pathname, "[data-route]");
  useEffect(() => {
    setMenu(false);
  }, [location.pathname]);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      {preview && (
        <div className="preview-bar">
          Local preview · Sample content and accounts · No production data
        </div>
      )}
      <header className="site-header">
        <Brand />
        <button
          className="menu-toggle"
          aria-expanded={menu}
          aria-controls="primary-navigation"
          onClick={() => setMenu(!menu)}
        >
          Menu {menu ? "−" : "+"}
        </button>
        <nav
          id="primary-navigation"
          className={menu ? "navigation open" : "navigation"}
          aria-label="Primary"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setMenu(false);
              document
                .querySelector<HTMLButtonElement>(".menu-toggle")
                ?.focus();
            }
          }}
        >
          {session.profile ? (
            <>
              <NavLink to="/dashboard">My fieldbook</NavLink>
              <NavLink to="/challenges">Challenges</NavLink>
              <NavLink to="/leaderboard">Leaderboard</NavLink>
              <NavLink to="/profile">Profile</NavLink>
              {session.profile.role === "admin" && (
                <NavLink to="/admin/challenges">Admin</NavLink>
              )}
              <button
                className="link-button"
                disabled={action.busy}
                onClick={() =>
                  action.run(async () => {
                    await (await academy).signOut();
                  })
                }
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/#method">The method</Link>
              <Link to="/challenges">Challenges</Link>
              <Link to="/login">Sign in</Link>
              <Link className="button primary" to="/register">
                Start learning <span aria-hidden="true">↗</span>
              </Link>
            </>
          )}
        </nav>
      </header>
      {!online && (
        <p className="notice offline" role="status">
          You’re offline. Loaded material remains available. Reconnect before
          submitting.
        </p>
      )}
      <Feedback action={action} />
      <main id="main" ref={ref} tabIndex={-1}>
        <RouteFocus />
        <Suspense
          fallback={
            <div className="page" role="status">
              Opening your fieldbook…
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <footer className="site-footer">
        <div>
          <Brand />
          <p>
            Observe carefully. Question assumptions.
            <br />
            Learn something worth keeping.
          </p>
        </div>
        <nav aria-label="Footer">
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>
        <Theme />
        <p className="copyright">© {new Date().getFullYear()} FlagForge</p>
      </footer>
    </>
  );
}
function Protected({ admin = false }: { admin?: boolean }) {
  const s = useSession(),
    location = useLocation();
  if (s.loading)
    return (
      <div className="page" role="status">
        Checking your session…
      </div>
    );
  if (s.error)
    return (
      <div className="page">
        <Heading title="Could not check your account" description={s.error} />
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  if (!s.user)
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (!s.profile)
    return (
      <Navigate
        to={`/register?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  if (s.profile.suspended)
    return (
      <div className="page">
        <Heading
          title="Your access is suspended"
          description="Your learning record is safe. Contact your instructor to discuss reinstatement."
        />
        <Link to="/contact">Contact the academy</Link>
      </div>
    );
  if (admin && s.profile.role !== "admin")
    return (
      <div className="page">
        <Heading title="Instructor access required" />
        <Link to="/dashboard">Return to your fieldbook</Link>
      </div>
    );
  if (s.maintenance && s.profile.role !== "admin")
    return (
      <div className="page">
        <Heading
          title="The academy is taking a short break"
          description="Maintenance is in progress. Your learning record is safe. Please return shortly."
        />
      </div>
    );
  return <Outlet />;
}
function Legacy() {
  const location = useLocation();
  const [params] = useSearchParams();
  const names: Record<string, string> = {
    "index.html": "/",
    "login.html": params.get("tab") === "register" ? "/register" : "/login",
    "admin.html": "/admin/challenges",
    "challenge.html": params.get("id")
      ? `/challenges/${encodeURIComponent(params.get("id")!)}`
      : "/challenges",
  };
  const file = location.pathname.slice(1);
  const query = new URLSearchParams(params);
  if (file === "challenge.html") query.delete("id");
  if (file === "login.html") query.delete("tab");
  const destination = names[file] || "/" + file.replace(".html", "");
  return (
    <Navigate
      replace
      to={destination + (query.size ? `?${query}` : "") + location.hash}
    />
  );
}
export default function App() {
  return (
    <Boundary>
      <SessionProvider>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Auth />} />
            <Route path="register" element={<Auth />} />
            <Route path="forgot-password" element={<Auth />} />
            {["contact", "privacy", "terms"].map((path) => (
              <Route key={path} path={path} element={<Information />} />
            ))}
            <Route element={<Protected />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="challenges" element={<Catalog />} />
              <Route path="challenges/:id" element={<Challenge />} />
              <Route path="leaderboard" element={<Leaderboard />} />
              <Route path="profile" element={<Profile />} />
            </Route>
            <Route element={<Protected admin />}>
              <Route path="admin/*" element={<Admin />} />
            </Route>
            {[
              "index",
              "login",
              "forgot-password",
              "dashboard",
              "challenges",
              "challenge",
              "leaderboard",
              "profile",
              "admin",
              "contact",
              "privacy",
              "terms",
            ].map((path) => (
              <Route key={path} path={`${path}.html`} element={<Legacy />} />
            ))}
            <Route
              path="*"
              element={
                <div className="page">
                  <Heading
                    title="This page is outside the map"
                    description="The address may have changed. Your next challenge is still waiting."
                  />
                  <Link className="button" to="/challenges">
                    Find a challenge
                  </Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </SessionProvider>
    </Boundary>
  );
}
