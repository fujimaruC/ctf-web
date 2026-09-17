import { Link, useNavigate, useSearchParams } from "react-router";
import { academy, preview } from "../data";
import { Field, Form, Feedback, Heading, useAction, useSession, useTitle } from "../ui";

export default function Auth() {
  const session = useSession(), action = useAction(), navigate = useNavigate();
  const [params] = useSearchParams();
  const returnTo = params.get("returnTo") || "/dashboard";
  const destination = returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\") ? returnTo : "/dashboard";
  const onboarding = !!session.user && !session.profile;
  useTitle(onboarding ? "Set up your profile" : "Sign in");
  return (
    <div className="auth-page" data-route>
      <aside className="auth-note">
        <p className="eyebrow">Field note / 001</p>
        <h2>Every expert<br />was once<br /><span className="accent">curious.</span></h2>
        <p>Learn at your own pace. The next discovery is yours to make.</p>
        <div className="note-lines" aria-hidden="true"><span /><span /><span /></div>
      </aside>
      <section className="auth-form">
        <Heading
          title={onboarding ? "Set up your fieldbook." : session.profile ? "You’re signed in." : "Welcome back."}
          description={onboarding ? "Choose the name your fellow learners will see. Your Google account remains your sign-in method." : "Continue securely with your Google account."}
        />
        {onboarding ? (
          <Form onSubmit={(data) => action.run(async () => {
            await (await academy).saveProfile(String(data.get("displayName")), String(data.get("username")));
            navigate(destination, { replace: true });
          })}>
            <Field label="Display name" name="displayName" defaultValue={session.user?.displayName || ""} autoComplete="name" minLength={2} maxLength={100} required />
            <Field label="Username" name="username" autoComplete="username" minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" hint="3–20 letters, numbers, or underscores. You can change this later." required />
            <Feedback action={action} />
            <button className="primary wide" disabled={action.busy} aria-busy={action.busy}>
              {action.busy ? "Saving profile…" : "Enter the academy"} <span aria-hidden="true">↗</span>
            </button>
          </Form>
        ) : session.profile ? (
          <Link className="button primary wide" to={destination}>Continue to your fieldbook <span aria-hidden="true">↗</span></Link>
        ) : (
          <>
            <Feedback action={action} />
            <button className="primary wide" disabled={action.busy} aria-busy={action.busy} onClick={() => action.run(async () => {
              await (await academy).signInWithGoogle();
              navigate(destination, { replace: true });
            })}>
              {action.busy ? "Opening Google…" : "Continue with Google"}
            </button>
            <p className="help" aria-live="polite">Popup blocked or on a mobile device? Google sign-in will continue in this tab.</p>
            {preview && <div className="preview-controls"><p className="eyebrow">Explore the local preview</p><button disabled={action.busy} onClick={() => action.run(async () => { await (await academy).signInWithGoogle(); navigate(destination); })}>Enter preview</button></div>}
          </>
        )}
        <p className="help">By continuing, you agree to the <Link to="/terms">terms</Link> and <Link to="/privacy">privacy notice</Link>.</p>
      </section>
    </div>
  );
}
