import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type FormEvent,
} from "react";
import { Link, useLocation } from "react-router";
import { academy, errorMessage } from "./data";
import type { Session, Challenge } from "./types";

const initial: Session = {
  user: null,
  profile: null,
  loading: true,
  error: "",
  maintenance: false,
};
const SessionContext = createContext(initial);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState(initial);
  useEffect(() => {
    let cancelled = false,
      stop = () => {};
    academy
      .then((api) => {
        if (!cancelled) stop = api.watchSession(setSession);
      })
      .catch((e) =>
        setSession({ ...initial, loading: false, error: errorMessage(e) }),
      );
    return () => {
      cancelled = true;
      stop();
    };
  }, []);
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
export const useSession = () => useContext(SessionContext);
export function useResource<T>(key: string, load: () => Promise<T>) {
  const fn = useRef(load);
  fn.current = load;
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error: string;
    loading: boolean;
  }>({ key, error: "", loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setState((s) => ({
      key,
      data: s.key === key ? s.data : undefined,
      error: "",
      loading: true,
    }));
    fn.current()
      .then((data) => {
        if (active) setState({ key, data, error: "", loading: false });
      })
      .catch((e) => {
        if (active)
          setState((s) => ({ ...s, error: errorMessage(e), loading: false }));
      });
    return () => {
      active = false;
    };
  }, [key, version]);
  return {
    ...state,
    data: state.key === key ? state.data : undefined,
    refresh: () => setVersion((v) => v + 1),
  };
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [slow, setSlow] = useState(false);
  const lock = useRef(false);
  async function run<T>(
    action: () => Promise<T>,
    success?: string,
  ): Promise<T | undefined> {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), 10000);
    try {
      const value = await action();
      if (success) setMessage(success);
      return value;
    } catch (e) {
      setError(errorMessage(e));
      return undefined;
    } finally {
      clearTimeout(timer);
      lock.current = false;
      setBusy(false);
      setSlow(false);
    }
  }
  return { busy, error, message, slow, run, setError, setMessage };
}
export function Feedback({ action }: { action: ReturnType<typeof useAction> }) {
  return (
    <>
      <p role="alert" className={action.error ? "notice error" : "sr-only"}>
        {action.error}
      </p>
      <p
        role="status"
        className={action.message || action.slow ? "notice" : "sr-only"}
      >
        {action.slow
          ? "Still waiting for confirmation. Keep this page open; your input is safe."
          : action.message}
      </p>
    </>
  );
}
export function LoadState({
  resource,
}: {
  resource: {
    loading: boolean;
    error: string;
    data?: unknown;
    refresh: () => void;
  };
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    setShow(false);
    const t = setTimeout(() => setShow(true), 200);
    return () => clearTimeout(t);
  }, [resource.loading]);
  return (
    <>
      <div role="status" className="load-status">
        {resource.loading &&
          (resource.data ? "Updating…" : show ? "Loading…" : "")}
      </div>
      {resource.loading && !resource.data && show && (
        <div className="skeleton" aria-hidden="true" />
      )}
      {resource.error && (
        <div className="notice error" role="alert">
          <p>{resource.error}</p>
          <button onClick={resource.refresh}>Retry</button>
        </div>
      )}
    </>
  );
}
export function Heading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 tabIndex={-1}>{title}</h1>
        {description && <p className="lede">{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-mark" aria-hidden="true">
        ∅
      </span>
      <h2>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
export function Field({
  label,
  name,
  type = "text",
  hint,
  ...props
}: {
  label: string;
  name: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      {hint && (
        <p id={`${name}-hint`} className="help">
          {hint}
        </p>
      )}
      <input
        id={name}
        name={name}
        type={type}
        aria-describedby={hint ? `${name}-hint` : undefined}
        {...props}
      />
    </div>
  );
}
export function Form({
  onSubmit,
  children,
  ...props
}: {
  onSubmit: (data: FormData, event: FormEvent<HTMLFormElement>) => void;
  children: ReactNode;
} & Omit<React.FormHTMLAttributes<HTMLFormElement>, "onSubmit">) {
  return (
    <form
      {...props}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(new FormData(e.currentTarget), e);
      }}
    >
      {children}
    </form>
  );
}
export function Dialog({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!open || !d) return;
    const trigger = document.activeElement as HTMLElement;
    d.showModal();
    (d.querySelector("[data-safe]") as HTMLElement | null)?.focus();
    return () => {
      d.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2>{title}</h2>
      {children}
      <button data-safe onClick={onClose}>
        Keep current state
      </button>
    </dialog>
  );
}
export function ChallengeCard({
  challenge: c,
  solved = false,
  index = 0,
}: {
  challenge: Challenge;
  solved?: boolean;
  index?: number;
}) {
  return (
    <Link
      className="challenge-card"
      to={`/challenges/${encodeURIComponent(c.id)}`}
    >
      <div className="card-top">
        <span className="eyebrow">
          {String(index + 1).padStart(2, "0")} / {c.category}
        </span>
        <span className="difficulty">{c.difficulty}</span>
      </div>
      <h2>{c.title}</h2>
      <p>{c.description}</p>
      <div className="card-bottom">
        <span className="numeric">
          {c.points} <span className="muted">pts</span>
        </span>
        <span>{solved ? "✓ Solved" : `${c.solveCount} solves`}</span>
        <span aria-hidden="true">↗</span>
      </div>
    </Link>
  );
}
export function useMotion(
  ref: RefObject<HTMLElement | null>,
  key: string,
  selector = "[data-reveal]",
) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let disposed = false;
    let revert = () => {};
    let observer: IntersectionObserver | undefined;
    let mutations: MutationObserver | undefined;
    function stop() {
      revert();
      observer?.disconnect();
      mutations?.disconnect();
    }
    async function start() {
      stop();
      if (media.matches || !ref.current) return;
      const { animate, createScope } = await import("animejs");
      if (disposed || media.matches || !ref.current) return;
      const scope = createScope({ root: ref.current });
      scope.add(() => {
        const seen = new WeakSet<Element>();
        observer = new IntersectionObserver(
          (entries) =>
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                scope.execute(() => {
                  animate(entry.target, {
                    opacity: [0.65, 1],
                    translateY: [8, 0],
                    duration: 420,
                    ease: "out(3)",
                  });
                  entry.target
                    .querySelectorAll<SVGPathElement>("[data-trace]")
                    .forEach((path, index) => {
                      const length = path.getTotalLength();
                      animate(path, {
                        strokeDasharray: [length, length],
                        strokeDashoffset: [length, 0],
                        delay: index * 350,
                        duration: 550,
                        ease: "out(3)",
                      });
                    });
                });
                observer?.unobserve(entry.target);
              }
            }),
          { threshold: 0.12 },
        );
        const observe = () =>
          ref.current?.querySelectorAll(selector).forEach((el) => {
            if (!seen.has(el)) {
              seen.add(el);
              observer?.observe(el);
            }
          });
        observe();
        mutations = new MutationObserver(observe);
        mutations.observe(ref.current!, { childList: true, subtree: true });
      });
      revert = () => scope.revert();
    }
    const change = () => {
      void start();
    };
    void start();
    media.addEventListener("change", change);
    return () => {
      disposed = true;
      stop();
      media.removeEventListener("change", change);
    };
  }, [key, ref, selector]);
}
export function RouteFocus() {
  const location = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const observer = new MutationObserver(focusHeading);
    function focusHeading() {
      const heading = document.querySelector<HTMLElement>("main h1");
      if (heading) {
        heading.focus();
        observer.disconnect();
      }
    }
    observer.observe(document.querySelector("main") || document.body, {
      childList: true,
      subtree: true,
    });
    focusHeading();
    return () => observer.disconnect();
  }, [location.pathname]);
  return null;
}
export function useTitle(title: string) {
  useEffect(() => {
    document.title = `${title} — FlagForge`;
  }, [title]);
}
