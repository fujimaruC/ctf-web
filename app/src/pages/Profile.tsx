import { useState } from "react";
import { Link } from "react-router";
import { academy, preview } from "../data";
import {
  Empty,
  Feedback,
  Field,
  Form,
  Heading,
  LoadState,
  useAction,
  useResource,
  useSession,
  useTitle,
} from "../ui";
import { History } from "./Learner";
export default function Profile() {
  useTitle("My profile");
  const { profile: p } = useSession(),
    profileAction = useAction(),
    passwordAction = useAction();
  const [cursor, setCursor] = useState<string>();
  const history = useResource(`history-${p!.uid}-${cursor || ""}`, async () =>
    (await academy).history(p!.uid, cursor),
  );
  const board = useResource(`profile-rank-${p!.uid}`, async () =>
    (await academy).leaderboard(),
  );
  return (
    <div className="page" data-route>
      <Heading
        eyebrow={`@${p!.username}`}
        title={p!.displayName}
        description="Your discoveries, your progress, your next chapter."
      />
      <div className="stat-strip">
        <div>
          <strong>{p!.points}</strong>
          <span>Points</span>
        </div>
        <div>
          <strong>{p!.solves}</strong>
          <span>Solves</span>
        </div>
        <div>
          <strong>{p!.firstBloods}</strong>
          <span>First bloods</span>
        </div>
        <div>
          <strong>
            {board.data?.me?.rank ? `#${board.data.me.rank}` : "—"}
          </strong>
          <span>Global rank</span>
        </div>
      </div>
      <LoadState resource={board} />
      <p className="eyebrow">
        {p!.role === "admin" ? "Instructor · " : ""}
        {p!.firstBloods > 0 ? "First investigator · " : ""}
        {board.data?.me?.rank && board.data.me.rank <= 3
          ? "Top three investigator"
          : ""}
      </p>
      <div className="two-columns">
        <section>
          <h2>Your learning record</h2>
          <LoadState resource={history} />
          {history.data?.items.length ? (
            <History solves={history.data.items} />
          ) : (
            history.data && (
              <Empty title="Your first discovery is waiting.">
                <Link to="/challenges">Find an Easy challenge</Link>
              </Empty>
            )
          )}
          <div className="pagination">
            {cursor && (
              <button onClick={() => setCursor(undefined)}>
                Back to newest
              </button>
            )}
            {history.data?.cursor && (
              <button onClick={() => setCursor(history.data!.cursor!)}>
                Older discoveries
              </button>
            )}
          </div>
        </section>
        <aside>
          <section className="form-section">
            <h2>Profile details</h2>
            <Form
              onSubmit={(data) =>
                profileAction.run(async () => {
                  await (
                    await academy
                  ).saveProfile(
                    String(data.get("displayName")),
                    String(data.get("username")),
                  );
                }, "Profile updated.")
              }
            >
              <Field
                label="Display name"
                name="displayName"
                defaultValue={p!.displayName}
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
              <Field
                label="Username"
                name="username"
                defaultValue={p!.username}
                autoComplete="username"
                pattern="[A-Za-z0-9_]+"
                minLength={3}
                maxLength={20}
                hint="3–20 letters, numbers, or underscores."
                required
              />
              <Field
                label="Email address"
                name="email"
                type="email"
                value={p!.email}
                readOnly
                hint="Contact your instructor if you need to change your email."
              />
              <Feedback action={profileAction} />
              <button className="primary" disabled={profileAction.busy}>
                Save profile
              </button>
            </Form>
          </section>
          <section className="form-section">
            <h2>Change password</h2>
            <Form
              onSubmit={(data, event) => {
                const form = event.currentTarget;
                void passwordAction.run(
                  async () => {
                    await (
                      await academy
                    ).changePassword(
                      String(data.get("currentPassword")),
                      String(data.get("newPassword")),
                    );
                    form.reset();
                  },
                  preview
                    ? "Preview only: no password was changed."
                    : "Password updated.",
                );
              }}
            >
              <Field
                label="Current password"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
              />
              <Field
                label="New password"
                name="newPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                hint="At least 8 characters. Use a unique password."
                required
              />
              <Feedback action={passwordAction} />
              <button disabled={passwordAction.busy}>Update password</button>
            </Form>
          </section>
        </aside>
      </div>
    </div>
  );
}
