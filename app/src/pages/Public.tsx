import { useRef } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { academy, preview } from "../data";
import { useSession, useTitle, useMotion, useResource, Heading } from "../ui";
import { categories } from "../types";
export function Landing() {
  useTitle("Learn by investigating");
  const session = useSession(),
    ref = useRef<HTMLDivElement>(null);
  useMotion(ref, "landing");
  const stats = useResource("public-stats", async () =>
    (await academy).stats(),
  );
  if (session.profile && !session.profile.suspended)
    return <Navigate to="/dashboard" replace />;
  return (
    <div ref={ref} className="landing">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="signal" /> A fieldbook for curious minds
          </p>
          <h1>
            Learn to see
            <br />
            what others
            <br />
            <span className="accent">overlook.</span>
          </h1>
          <p className="hero-description">
            Cybersecurity begins with a better question.
            <br />
            Build the habit through hands-on challenges,
            <br className="desktop-break" /> one discovery at a time.
          </p>
          <div className="hero-actions">
            <Link className="button primary" to="/register">
              Open your fieldbook <span aria-hidden="true">↗</span>
            </Link>
            <a className="text-link" href="#method">
              How we learn <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="hero-note">
            No experience required. Curiosity recommended.
          </p>
        </div>
        <figure className="experiment" data-reveal>
          <div className="plate-heading">
            <span>FIELD STUDY / 001</span>
            <span>WEB SECURITY</span>
          </div>
          <svg
            viewBox="0 0 520 440"
            role="img"
            aria-labelledby="diagram-title diagram-description"
          >
            <title id="diagram-title">Where does trust begin?</title>
            <desc id="diagram-description">
              A browser sends a request across a trust boundary. The server
              checks the request before granting access. Inspecting that
              boundary is the first exercise.
            </desc>
            <defs>
              <pattern
                id="grid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth=".5"
                  opacity=".16"
                />
              </pattern>
            </defs>
            <rect x="0" y="0" width="520" height="440" fill="url(#grid)" />
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle
                cx="260"
                cy="218"
                r="158"
                strokeDasharray="3 7"
                opacity=".35"
              />
              <path
                d="M260 32V402"
                className="diagram-accent"
                strokeDasharray="6 6"
              />
              <rect x="42" y="150" width="154" height="124" rx="2" />
              <path d="M42 179H196" />
              <circle cx="58" cy="165" r="2" />
              <circle cx="69" cy="165" r="2" />
              <circle cx="80" cy="165" r="2" />
              <rect x="324" y="150" width="154" height="124" rx="2" />
              <path d="M196 209H324M324 240H196" data-trace />
              <path d="m316 203 8 6-8 6m-112 19-8 6 8 6" />
              <path d="M90 300v27h78M431 300v27h-64" />
            </g>
            <g fill="currentColor" fontFamily="IBM Plex Sans,sans-serif">
              <text x="66" y="211" fontSize="17">
                Browser
              </text>
              <text x="66" y="239" fontSize="12">
                UNTRUSTED INPUT
              </text>
              <text x="346" y="200" fontSize="17">
                Server
              </text>
              <text x="346" y="226" fontSize="12">
                VERIFY FIRST.
              </text>
              <text x="346" y="246" fontSize="12">
                THEN TRUST.
              </text>
              <text x="279" y="66" fontSize="11" className="diagram-accent">
                TRUST BOUNDARY
              </text>
              <text x="71" y="351" fontSize="12">
                01 / OBSERVE
              </text>
              <text x="345" y="351" fontSize="12">
                02 / QUESTION
              </text>
            </g>
            <circle cx="260" cy="209" r="30" className="diagram-circle" />
            <path
              d="m249 209 7 7 16-17"
              fill="none"
              className="diagram-check"
              data-trace
              strokeWidth="2.5"
            />
          </svg>
          <figcaption>
            <span className="figure-number">01</span>
            <div>
              <strong>The interesting part is the boundary.</strong>
              <p>Look closer. What does the server believe?</p>
            </div>
            <span className="plate-cross" aria-hidden="true">
              +
            </span>
          </figcaption>
        </figure>
      </section>
      <section id="method" className="method">
        <div className="section-intro" data-reveal>
          <p className="eyebrow">A practice, not a shortcut</p>
          <h2>
            Small discoveries.
            <br />
            Lasting understanding.
          </h2>
          <p>
            You don’t need every answer to begin. You need a place to
            investigate.
          </p>
        </div>
        <ol className="method-steps">
          {[
            [
              "Observe",
              "Choose a challenge. Read the brief. Notice what feels ordinary—and what doesn’t.",
            ],
            [
              "Investigate",
              "Follow the evidence. Try an idea. Use a hint when you need another perspective.",
            ],
            [
              "Understand",
              "Submit your flag. Keep the lesson. Carry a sharper question into the next challenge.",
            ],
          ].map(([title, body], i) => (
            <li data-reveal key={title}>
              <span className="step-number">0{i + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
      <section className="disciplines">
        <div className="section-top">
          <div>
            <p className="eyebrow">Six ways to look closer</p>
            <h2>Find your first question.</h2>
          </div>
          <Link className="text-link" to="/challenges">
            Explore challenges ↗
          </Link>
        </div>
        <div className="discipline-list">
          {categories.map((c, i) => (
            <Link data-reveal to={`/challenges?category=${c}`} key={c}>
              <span className="muted numeric">0{i + 1}</span>
              <h3>
                {c === "Pwn"
                  ? "Binary exploitation"
                  : c === "Misc"
                    ? "Beyond the categories"
                    : c}
              </h3>
              <span aria-hidden="true">↗</span>
            </Link>
          ))}
        </div>
      </section>
      <section className="closing" data-reveal>
        <p className="eyebrow">Your next discovery starts here</p>
        <h2>
          Bring your curiosity.
          <br />
          We’ll bring the questions.
        </h2>
        <Link className="button primary" to="/register">
          Start learning ↗
        </Link>
        {stats.data && (
          <p className="muted">
            {preview ? "In this sample fieldbook: " : ""}
            {stats.data.challenges} challenges · {stats.data.players} learners ·{" "}
            {stats.data.solves} discoveries
          </p>
        )}
      </section>
    </div>
  );
}
export function Information() {
  const path = useLocation().pathname;
  const name =
    path === "/contact" ? "Contact" : path === "/privacy" ? "Privacy" : "Terms";
  useTitle(name);
  const email = import.meta.env.VITE_SUPPORT_EMAIL;
  return (
    <article className="page prose" data-route>
      <Heading eyebrow="Academy information" title={name} />
      {name === "Contact" ? (
        <>
          <h2>Good questions are welcome.</h2>
          <p>
            Need help with your account, a challenge, or academy access? Contact
            your instructor.
          </p>
          {email ? (
            <a href={`mailto:${email}`}>{email}</a>
          ) : (
            <p className="notice">
              A public support address has not been configured. Use your
              instructor’s existing contact channel.
            </p>
          )}
        </>
      ) : name === "Privacy" ? (
        <>
          <h2>Your learning record</h2>
          <p>
            FlagForge stores your account identity, username, challenge
            attempts, solves, points, and first-blood achievements in Firebase.
            Firebase Authentication manages your password.
          </p>
          <p>
            Signed-in learners can see display names, usernames, scores, and
            solve records. Email addresses and account roles are restricted to
            you and authorized administrators.
          </p>
          <p>
            Suspension preserves learning history. Contact your instructor about
            access, correction, or deletion requests. Theme preferences stay in
            your browser. Flags and passwords are not stored in browser drafts.
          </p>
          <h2>Before production launch</h2>
          <p>
            The academy operator must publish its contact details and retention
            policy. This deployment does not add analytics or push
            notifications.
          </p>
        </>
      ) : (
        <>
          <h2>Practice with permission.</h2>
          <p>
            Work only on the supplied challenge material and systems you are
            explicitly authorized to test. Do not attack the platform, other
            learners, or unrelated services.
          </p>
          <p>
            Respect other learners and keep challenge answers private.
            Administrators may suspend access for misuse. External challenge
            files remain subject to their providers’ terms.
          </p>
          <p>
            Challenges are educational exercises. Their techniques belong in an
            authorized learning environment.
          </p>
        </>
      )}
      <Link className="text-link" to="/">
        Return to FlagForge ↗
      </Link>
    </article>
  );
}
