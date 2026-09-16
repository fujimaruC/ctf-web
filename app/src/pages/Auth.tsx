import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { academy, preview } from "../data";
import {
  Field,
  Form,
  Feedback,
  Heading,
  useAction,
  useSession,
  useTitle,
} from "../ui";
export default function Auth() {
  const path = useLocation().pathname,
    register = path === "/register",
    reset = path === "/forgot-password";
  const session = useSession(),
    action = useAction(),
    navigate = useNavigate();
  const [params] = useSearchParams();
  const [show, setShow] = useState(false);
  const title = reset
    ? "Find your way back."
    : register
      ? "Start your fieldbook."
      : "Welcome back.";
  useTitle(
    reset ? "Reset password" : register ? "Join the academy" : "Sign in",
  );
  const returnTo = params.get("returnTo") || "/dashboard";
  const destination =
    returnTo.startsWith("/") &&
    !returnTo.startsWith("//") &&
    !returnTo.includes("\\")
      ? returnTo
      : "/dashboard";
  return (
    <div className="auth-page" data-route>
      <aside className="auth-note">
        <p className="eyebrow">Field note / 001</p>
        <h2>
          Every expert
          <br />
          was once
          <br />
          <span className="accent">curious.</span>
        </h2>
        <p>Learn at your own pace. The next discovery is yours to make.</p>
        <div className="note-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </aside>
      <section className="auth-form">
        <Heading
          title={title}
          description={
            reset
              ? "Enter your account email to request a reset link."
              : register
                ? "A place to practice, investigate, and grow."
                : "Your questions are right where you left them."
          }
        />
        <Form
          onSubmit={(data) =>
            action.run(async () => {
              const api = await academy;
              const email = String(
                data.get("email") || session.user?.email || "",
              );
              const password = String(data.get("password") || "");
              if (reset) {
                await api.resetPassword(email);
                action.setMessage(
                  preview
                    ? "Preview only: no email was sent."
                    : "If an account exists, a reset link will arrive shortly.",
                );
                return;
              }
              if (register) {
                if (!session.user) await api.register(email, password);
                await api.saveProfile(
                  String(data.get("displayName")),
                  String(data.get("username")),
                );
              } else await api.signIn(email, password);
              navigate(destination, { replace: true });
            })
          }
        >
          {register && (
            <>
              <Field
                label="Display name"
                name="displayName"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
              <Field
                label="Username"
                name="username"
                autoComplete="username"
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_]+"
                hint="3–20 letters, numbers, or underscores. You can change this later."
                required
              />
            </>
          )}
          {!(register && session.user) && (
            <Field
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          )}
          {!reset && !(register && session.user) && (
            <>
              <Field
                label="Password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                minLength={register ? 8 : undefined}
                hint={
                  register
                    ? "At least 8 characters. Use a unique password."
                    : undefined
                }
                required
              />
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={show}
                  onChange={(e) => setShow(e.target.checked)}
                />
                Show password
              </label>
            </>
          )}
          <Feedback action={action} />
          <button
            className="primary wide"
            disabled={action.busy}
            aria-busy={action.busy}
          >
            {action.busy
              ? "Please wait…"
              : reset
                ? "Send reset link"
                : register && session.user
                  ? "Complete profile"
                  : register
                    ? "Create account"
                    : "Sign in"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          {register && session.user && (
            <p className="help">
              Your account exists. Complete your profile to enter the academy.
            </p>
          )}
        </Form>
        {!reset && (
          <p>
            {register ? "Already have an account? " : "New to the academy? "}
            <Link
              to={`${register ? "/login" : "/register"}?returnTo=${encodeURIComponent(destination)}`}
            >
              {register ? "Sign in" : "Create account"}
            </Link>
          </p>
        )}
        {!register && (
          <Link to={reset ? "/login" : "/forgot-password"}>
            {reset ? "Back to sign in" : "Forgot password?"}
          </Link>
        )}
        {register && (
          <p className="help">
            By joining, you agree to the <Link to="/terms">terms</Link> and{" "}
            <Link to="/privacy">privacy notice</Link>.
          </p>
        )}
        {preview && !reset && (
          <div className="preview-controls">
            <p className="eyebrow">Explore the local preview</p>
            <button
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  await (await academy).signIn("learner@example.test", "");
                  navigate(destination);
                })
              }
            >
              Enter as learner
            </button>
            <button
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  await (await academy).signIn("instructor@example.test", "");
                  navigate("/admin/challenges");
                })
              }
            >
              Enter as instructor
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
