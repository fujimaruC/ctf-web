import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { academy, date, safeLink } from "../data";
import { categories, difficulties, type Player, type Solve } from "../types";
import {
  ChallengeCard,
  Empty,
  Feedback,
  Field,
  Form,
  Heading,
  LoadState,
  useAction,
  useMotion,
  useResource,
  useSession,
  useTitle,
} from "../ui";

export function History({ solves }: { solves: Solve[] }) {
  return (
    <ul className="history">
      {solves.map((s) => (
        <li key={s.id}>
          <Link to={`/challenges/${encodeURIComponent(s.challengeId)}`}>
            <div>
              <strong>{s.challengeName}</strong>
              <small>
                {s.category} · {date(s.solvedAt)}
                {s.isFirstBlood ? " · First blood" : ""}
              </small>
            </div>
            <span className="numeric">+{s.points}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
export function Dashboard() {
  useTitle("My fieldbook");
  const { profile: p } = useSession();
  const catalog = useResource("dashboard-catalog", async () =>
    (await academy).catalog(),
  );
  const progress = useResource(`progress-${p!.uid}`, async () =>
    (await academy).progress(p!.uid),
  );
  const board = useResource(`rank-${p!.uid}`, async () =>
    (await academy).leaderboard(),
  );
  const solved = new Set(progress.data?.map((s) => s.challengeId));
  const next = catalog.data
    ?.filter((c) => !solved.has(c.id))
    .sort(
      (a, b) =>
        difficulties.indexOf(a.difficulty) -
          difficulties.indexOf(b.difficulty) || a.points - b.points,
    )[0];
  return (
    <div className="page" data-route>
      <Heading
        eyebrow="Your learning record"
        title={`Keep looking, ${p!.displayName.split(" ")[0]}.`}
        description="Every challenge is another chance to notice something new."
      />
      <div className="stat-strip">
        <div>
          <strong>{p!.points}</strong>
          <span>Total points</span>
        </div>
        <div>
          <strong>{p!.solves}</strong>
          <span>Challenges solved</span>
        </div>
        <div>
          <strong>
            {board.data?.me?.rank ? `#${board.data.me.rank}` : "—"}
          </strong>
          <span>Global rank</span>
        </div>
        <div>
          <strong>{p!.firstBloods}</strong>
          <span>First bloods</span>
        </div>
      </div>
      <LoadState resource={board} />
      <div className="two-columns">
        <section>
          <LoadState resource={catalog} />
          <LoadState resource={progress} />
          {next && (
            <div className="next-step">
              <p className="eyebrow">
                Your next investigation / {next.category}
              </p>
              <h2>{next.title}</h2>
              <p>{next.description}</p>
              <Link className="button primary" to={`/challenges/${next.id}`}>
                Read the brief ↗
              </Link>
              <p className="help">
                {next.difficulty} · {next.points} points · Hints available
              </p>
            </div>
          )}
          {catalog.data && progress.data && !next && (
            <Empty
              title={
                catalog.data.length
                  ? "A fieldbook full of discoveries."
                  : "Your first challenge is on its way."
              }
            >
              <p>
                {catalog.data.length
                  ? "You’ve solved every published challenge. Check back for new investigations."
                  : "Your instructor has not published challenges yet."}
              </p>
            </Empty>
          )}
          <h2>Recent discoveries</h2>
          {progress.data?.length ? (
            <History
              solves={[...progress.data]
                .sort((a, b) => b.solvedAt - a.solvedAt)
                .slice(0, 6)}
            />
          ) : (
            progress.data && (
              <p>
                No solves yet. Start with an Easy challenge and follow the
                evidence.
              </p>
            )
          )}
          <Link className="text-link" to="/profile">
            View your learning record ↗
          </Link>
        </section>
        <aside>
          <p className="eyebrow">Across the disciplines</p>
          <h2>Growing your range.</h2>
          {categories.map((cat) => {
            const total =
              catalog.data?.filter((c) => c.category === cat).length || 0;
            const count =
              catalog.data?.filter(
                (c) => c.category === cat && solved.has(c.id),
              ).length || 0;
            return (
              <div className="progress-item" key={cat}>
                <div className="progress-label">
                  <Link to={`/challenges?category=${cat}`}>{cat}</Link>
                  <span className="numeric">
                    {count} / {total}
                  </span>
                </div>
                <progress
                  aria-label={`${cat} progress`}
                  value={count}
                  max={total || 1}
                />
              </div>
            );
          })}
          <h2>Activity</h2>
          {progress.data
            ?.slice()
            .sort((a, b) => b.solvedAt - a.solvedAt)
            .slice(0, 5)
            .map((s) => (
              <p key={s.id} className="help">
                Solved {s.challengeName} · +{s.points} points
                <br />
                {date(s.solvedAt)}
              </p>
            ))}
          {progress.data?.length === 0 && (
            <p className="muted">Your first discovery will appear here.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

export function Catalog() {
  useTitle("Challenges");
  const { profile } = useSession();
  const [params, setParams] = useSearchParams();
  const [count, setCount] = useState(24);
  const resource = useResource("catalog", async () =>
    (await academy).catalog(),
  );
  const solves = useResource(`catalog-solves-${profile!.uid}`, async () =>
    (await academy).progress(profile!.uid),
  );
  const ref = useRef<HTMLDivElement>(null);
  const category = params.get("category") || "all",
    difficulty = params.get("difficulty") || "all",
    search = params.get("q") || "",
    sort = params.get("sort") || "newest";
  const solved = new Set(solves.data?.map((s) => s.challengeId));
  function set(name: string, value: string) {
    setCount(24);
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!value || value === "all") next.delete(name);
        else next.set(name, value);
        return next;
      },
      { replace: name === "q" },
    );
  }
  const results = resource.data
    ?.filter(
      (c) =>
        (category === "all" || c.category === category) &&
        (difficulty === "all" || c.difficulty === difficulty) &&
        `${c.title} ${c.description}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "points-asc"
        ? a.points - b.points
        : sort === "points-desc"
          ? b.points - a.points
          : sort === "solves-desc"
            ? b.solveCount - a.solveCount
            : b.createdAt - a.createdAt,
    );
  useMotion(
    ref,
    `${params.toString()}-${resource.data?.length}-${count}`,
    ".challenge-card",
  );
  return (
    <div className="page" data-route>
      <Heading
        eyebrow="The challenge collection"
        title="Follow your curiosity."
        description="Pick a question. Explore a new discipline. Easy is a good place to begin."
      />
      <div className="toolbar">
        <Field
          label="Search challenges"
          name="search"
          type="search"
          placeholder="A title, a clue, an idea…"
          value={search}
          onChange={(e) => set("q", e.target.value)}
        />
        <div className="field">
          <label htmlFor="sort">Sort by</label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => set("sort", e.target.value)}
          >
            <option value="newest">Newest first</option>
            <option value="points-asc">Points: low to high</option>
            <option value="points-desc">Points: high to low</option>
            <option value="solves-desc">Most solved</option>
          </select>
        </div>
      </div>
      {[
        ["Category", ["all", ...categories], category, "category"],
        ["Difficulty", ["all", ...difficulties], difficulty, "difficulty"],
      ].map(([label, options, value, key]) => (
        <fieldset className="filters" key={String(key)}>
          <legend>{String(label)}</legend>
          {(options as string[]).map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={String(key)}
                value={option}
                checked={value === option}
                onChange={() => set(String(key), option)}
              />
              {option === "all" ? "All" : option}
            </label>
          ))}
        </fieldset>
      ))}
      <LoadState resource={resource} />
      <LoadState resource={solves} />
      <p role="status" className="help">
        {results
          ? `${results.length} challenge${results.length === 1 ? "" : "s"}${search ? ` matching “${search}”` : ""}`
          : ""}
      </p>
      <div ref={ref} className="challenge-grid">
        {results?.slice(0, count).map((c, i) => (
          <ChallengeCard
            key={c.id}
            challenge={c}
            index={i}
            solved={solved.has(c.id)}
          />
        ))}
      </div>
      {results?.length === 0 && (
        <Empty
          title={
            resource.data?.length
              ? "No discoveries here yet."
              : "The collection is getting ready."
          }
        >
          {resource.data?.length ? (
            <>
              <p>No challenges match these filters.</p>
              <button onClick={() => setParams({})}>Clear filters</button>
            </>
          ) : (
            <p>Your instructor will publish the first challenges here.</p>
          )}
        </Empty>
      )}
      {results && results.length > count && (
        <button onClick={() => setCount((c) => c + 24)}>
          Show 24 more challenges
        </button>
      )}
    </div>
  );
}

export function ChallengePage() {
  const motion = useRef<HTMLDivElement>(null);
  useMotion(motion, "verification", "[data-verified]");
  const { id = "" } = useParams(),
    { profile } = useSession();
  const resource = useResource(`challenge-${id}`, async () =>
    (await academy).challenge(id),
  );
  const detail = useResource(`detail-${profile!.uid}-${id}`, async () =>
    (await academy).detail(profile!.uid, id),
  );
  const action = useAction();
  const [flag, setFlag] = useState(""),
    [confirmed, setConfirmed] = useState<{
      points: number;
      firstBlood: boolean;
    } | null>(null),
    [attempts, setAttempts] = useState<number | null>(null);
  const request = useRef<{ flag: string; id: string } | null>(null);
  const c = resource.data;
  useTitle(c?.title || "Challenge");
  useEffect(() => {
    setFlag("");
    setConfirmed(null);
    setAttempts(null);
    request.current = null;
  }, [id]);
  const solved =
    confirmed ||
    (detail.data?.solve
      ? {
          points: detail.data.solve.points,
          firstBlood: detail.data.solve.isFirstBlood,
        }
      : null);
  return (
    <div className="page" data-route ref={motion}>
      <Link className="breadcrumb" to="/challenges">
        ← All challenges
      </Link>
      <LoadState resource={resource} />
      {c === null && (
        <Empty title="This challenge is unavailable.">
          <p>
            It may have been removed or unpublished. Historical solves remain in
            your fieldbook.
          </p>
          <Link to="/challenges">Choose another challenge</Link>
        </Empty>
      )}
      {c && (
        <>
          <Heading
            eyebrow={`${c.category} / ${c.difficulty}`}
            title={c.title}
            description={`An investigation by ${c.authorName}`}
          >
            <span className="rank">{c.points} pts</span>
          </Heading>
          <div className="challenge-layout">
            <div>
              <section className="challenge-section">
                <p className="eyebrow">01 / The brief</p>
                <h2>Look closer.</h2>
                <p className="challenge-body">{c.description}</p>
                <div className="challenge-meta">
                  <span>{c.solveCount} solves</span>
                  <span>Added {date(c.createdAt)}</span>
                  <span>{c.hints.length} free hints</span>
                </div>
              </section>
              {c.files.length > 0 && (
                <section className="challenge-section">
                  <p className="eyebrow">02 / The evidence</p>
                  <h2>Challenge files</h2>
                  <ul className="file-list">
                    {c.files.map((file, i) => (
                      <li key={i}>
                        {safeLink(file.url) ? (
                          <a
                            href={safeLink(file.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {file.name} ↗{" "}
                            <span className="help">
                              Opens an external file in a new tab
                            </span>
                          </a>
                        ) : (
                          <p className="notice">
                            This file link is unavailable. Contact your
                            instructor.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {c.hints.length > 0 && (
                <section className="challenge-section">
                  <p className="eyebrow">A different perspective</p>
                  <h2>Hints, when you need them.</h2>
                  {c.hints.map((h, i) => (
                    <details key={i}>
                      <summary>
                        Hint {i + 1} <span className="help">· Free</span>
                      </summary>
                      <p>{h.text}</p>
                    </details>
                  ))}
                </section>
              )}
              <section>
                <h2>First investigators</h2>
                <LoadState resource={detail} />
                {detail.data?.solvers.length ? (
                  <ol>
                    {detail.data.solvers.map((s) => (
                      <li key={s.id}>
                        {s.playerName} · {date(s.solvedAt)}
                        {s.isFirstBlood ? " · First blood" : ""}
                      </li>
                    ))}
                  </ol>
                ) : (
                  detail.data && (
                    <p>
                      No solves yet. There’s still a first discovery to make.
                    </p>
                  )
                )}
              </section>
            </div>
            <aside className="submission">
              <p className="eyebrow">Record your finding</p>
              <h2
                key={solved ? "verified" : "pending"}
                data-verified={solved ? "" : undefined}
              >
                {solved ? "Discovery verified." : "Found the flag?"}
              </h2>
              {solved ? (
                <div role="status">
                  <p className="rank">+{solved.points} points</p>
                  <p>
                    Saved to your learning record.
                    {solved.firstBlood ? " You made the first discovery." : ""}
                  </p>
                  <Link className="button primary" to="/challenges">
                    Find your next question ↗
                  </Link>
                </div>
              ) : (
                <Form
                  onSubmit={() =>
                    action.run(async () => {
                      if (!navigator.onLine)
                        throw new Error(
                          "You’re offline. Reconnect before submitting.",
                        );
                      if (!request.current || request.current.flag !== flag)
                        request.current = { flag, id: crypto.randomUUID() };
                      const result = await (
                        await academy
                      ).submit(id, flag, request.current.id);
                      setAttempts(result.attempts);
                      request.current = null;
                      if (result.outcome === "incorrect") {
                        action.setError(
                          "That flag does not match. Keep your notes, try another idea, or open a hint.",
                        );
                      } else {
                        setConfirmed(result);
                        setFlag("");
                        detail.refresh();
                        resource.refresh();
                      }
                    })
                  }
                >
                  <p className="muted">
                    Submit your answer to verify your discovery. Your points are
                    saved only after confirmation.
                  </p>
                  <Field
                    label="Flag"
                    name="flag"
                    value={flag}
                    onChange={(e) => setFlag(e.target.value)}
                    placeholder="FLAG{…}"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={2048}
                    required
                  />
                  <Feedback action={action} />
                  <button
                    className="primary wide"
                    disabled={action.busy || detail.loading || !!detail.error}
                    aria-busy={action.busy}
                  >
                    {action.busy ? "Checking your finding…" : "Verify flag ↗"}
                  </button>
                  <p className="help">
                    {attempts ?? detail.data?.attempts ?? 0} attempts · Up to 10
                    attempts per 5 minutes
                  </p>
                </Form>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function AnimatedRows({ players, uid }: { players: Player[]; uid: string }) {
  const ref = useRef<HTMLTableSectionElement>(null),
    positions = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    let disposed = false;
    let clean = () => {};
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      if (media.matches) clean();
    };
    media.addEventListener("change", stop);
    const rows = [
        ...(ref.current?.querySelectorAll<HTMLTableRowElement>("tr") || []),
      ],
      next = new Map(
        rows.map((row) => [row.dataset.uid!, row.getBoundingClientRect().top]),
      );
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      void import("animejs").then(({ animate, createScope }) => {
        if (disposed || matchMedia("(prefers-reduced-motion: reduce)").matches)
          return;
        const scope = createScope({ root: ref }).add(() => {
          rows.forEach((row) => {
            const before = positions.current.get(row.dataset.uid!),
              after = next.get(row.dataset.uid!);
            if (before !== undefined && after !== undefined && before !== after)
              animate(row, {
                translateY: [before - after, 0],
                duration: 420,
                ease: "out(3)",
              });
          });
        });
        positions.current = next;
        clean = () => scope.revert();
      });
    else positions.current = next;
    return () => {
      disposed = true;
      clean();
      media.removeEventListener("change", stop);
    };
  }, [players]);
  return (
    <tbody ref={ref}>
      {players.map((p) => (
        <tr
          key={p.uid}
          data-uid={p.uid}
          className={uid === p.uid ? "current-user" : ""}
        >
          <td className="rank">{String(p.rank).padStart(2, "0")}</td>
          <th scope="row">
            {p.displayName}
            {uid === p.uid ? " · You" : ""}
            <small>@{p.username}</small>
          </th>
          <td>{p.solves}</td>
          <td>{p.firstBloods}</td>
          <td>
            <strong>{p.points}</strong>
          </td>
        </tr>
      ))}
    </tbody>
  );
}
export function Leaderboard() {
  useTitle("Leaderboard");
  const { profile } = useSession();
  const resource = useResource(`leaderboard-${profile!.uid}`, async () =>
    (await academy).leaderboard(),
  );
  return (
    <div className="page" data-route>
      <Heading
        eyebrow="The academy record"
        title="Good questions. Great company."
        description="Celebrate discoveries across the academy. Rankings update when you refresh."
      >
        <button disabled={resource.loading} onClick={resource.refresh}>
          Refresh rankings
        </button>
      </Heading>
      <LoadState resource={resource} />
      {resource.data?.me && (
        <div className="notice" role="status">
          Your position: <strong>#{resource.data.me.rank}</strong> ·{" "}
          {resource.data.me.points} points · {resource.data.me.solves}{" "}
          discoveries
        </div>
      )}
      {resource.data?.players.length ? (
        <>
          <div className="stat-strip">
            {resource.data.players.slice(0, 3).map((p) => (
              <div key={p.uid}>
                <span>Rank {p.rank}</span>
                <strong>{p.displayName}</strong>
                <span>{p.points} points</span>
              </div>
            ))}
          </div>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Leaderboard table, scroll horizontally on small screens"
          >
            <table>
              <caption>Top 50 investigators</caption>
              <thead>
                <tr>
                  <th scope="col">Rank</th>
                  <th scope="col">Learner</th>
                  <th scope="col">Solves</th>
                  <th scope="col">First bloods</th>
                  <th scope="col">Points</th>
                </tr>
              </thead>
              <AnimatedRows
                players={resource.data.players}
                uid={profile!.uid}
              />
            </table>
          </div>
          <p className="help">
            Ordered by points, solves, first bloods, then display name. Exact
            ties use a stable account order.
          </p>
        </>
      ) : (
        resource.data && (
          <Empty title="The first page is still unwritten.">
            <p>Solve a challenge to start your learning record.</p>
            <Link to="/challenges">Explore challenges</Link>
          </Empty>
        )
      )}
    </div>
  );
}
