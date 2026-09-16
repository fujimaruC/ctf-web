import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useBlocker,
} from "react-router";
import { academy, date, downloadCsv } from "../data";
import {
  categories,
  difficulties,
  type ChallengeDraft,
  type Profile as ProfileType,
  type Repair,
} from "../types";
import {
  Dialog,
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

export default function Admin() {
  useTitle("Academy administration");
  return (
    <div className="page" data-route>
      <p className="eyebrow">Instructor workspace</p>
      <nav className="admin-nav" aria-label="Administration">
        <NavLink to="/admin/challenges" end>
          Challenges
        </NavLink>
        <NavLink to="/admin/challenges/new">Create challenge</NavLink>
        <NavLink to="/admin/students">Learners</NavLink>
        <NavLink to="/admin/settings">Settings</NavLink>
      </nav>
      <Routes>
        <Route index element={<Navigate to="challenges" replace />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="challenges/new" element={<Editor />} />
        <Route path="challenges/:id/edit" element={<Editor />} />
        <Route path="students" element={<Students />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/admin/challenges" replace />} />
      </Routes>
    </div>
  );
}
function Challenges() {
  const resource = useResource("admin-challenges", async () =>
      (await academy).catalog(true),
    ),
    action = useAction();
  const [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [published, setPublished] = useState("all"),
    [target, setTarget] = useState<{ id: string; title: string } | null>(null),
    [page, setPage] = useState(1);
  const notice = useLocation().state?.notice;
  const filtered = resource.data?.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) &&
      (category === "all" || c.category === category) &&
      (published === "all" || String(c.published) === published),
  );
  return (
    <>
      <Heading
        title="The challenge collection."
        description="Create good questions. Give learners room to investigate."
      >
        <Link className="button primary" to="/admin/challenges/new">
          Create challenge ↗
        </Link>
      </Heading>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="toolbar">
        <Field
          label="Search challenges"
          name="admin-search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="field">
          <label htmlFor="admin-category">Category</label>
          <select
            id="admin-category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="publication">Publication</label>
          <select
            id="publication"
            value={published}
            onChange={(e) => {
              setPublished(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All challenges</option>
            <option value="true">Published</option>
            <option value="false">Draft</option>
          </select>
        </div>
        <button
          disabled={!resource.data}
          onClick={() =>
            downloadCsv("challenges.csv", [
              [
                "Title",
                "Category",
                "Difficulty",
                "Points",
                "Solves",
                "Status",
                "Author",
                "Created",
              ],
              ...resource.data!.map((c) => [
                c.title,
                c.category,
                c.difficulty,
                c.points,
                c.solveCount,
                c.published ? "Published" : "Draft",
                c.authorName,
                date(c.createdAt),
              ]),
            ])
          }
        >
          Export CSV
        </button>
      </div>
      <LoadState resource={resource} />
      <Feedback action={action} />
      {filtered?.length ? (
        <>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Challenge administration table"
          >
            <table>
              <caption>{filtered.length} challenges</caption>
              <thead>
                <tr>
                  <th scope="col">Challenge</th>
                  <th scope="col">Points</th>
                  <th scope="col">Solves</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 50, page * 50).map((c) => (
                  <tr key={c.id}>
                    <th scope="row">
                      {c.title}
                      <small>
                        {c.category} · {c.difficulty}
                      </small>
                    </th>
                    <td>{c.points}</td>
                    <td>{c.solveCount}</td>
                    <td>{c.published ? "Published" : "Draft"}</td>
                    <td>
                      <div className="actions">
                        <Link
                          className="button"
                          to={`/admin/challenges/${c.id}/edit`}
                        >
                          Edit<span className="sr-only"> {c.title}</span>
                        </Link>
                        <button
                          disabled={action.busy}
                          onClick={() =>
                            action.run(async () => {
                              await (
                                await academy
                              ).adminChallenge(
                                "publish",
                                c.id,
                                undefined,
                                !c.published,
                              );
                              resource.refresh();
                            }, "Publication updated.")
                          }
                        >
                          {c.published ? "Unpublish" : "Publish"}
                          <span className="sr-only"> {c.title}</span>
                        </button>
                        <button className="danger" onClick={() => setTarget(c)}>
                          Delete<span className="sr-only"> {c.title}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            {page > 1 && (
              <button onClick={() => setPage((p) => p - 1)}>Previous</button>
            )}
            {filtered.length > page * 50 && (
              <button onClick={() => setPage((p) => p + 1)}>Next 50</button>
            )}
          </div>
        </>
      ) : (
        filtered && (
          <Empty title="No matching challenges.">
            <p>Change your filters or create a new challenge.</p>
          </Empty>
        )
      )}
      <Dialog
        open={!!target}
        title={`Delete ${target?.title || "challenge"}?`}
        onClose={() => {
          if (!action.busy) setTarget(null);
        }}
      >
        <p>
          This permanently removes the challenge and its private flag. Existing
          solve history and awarded points are retained.
        </p>
        <Feedback action={action} />
        <button
          className="danger"
          disabled={action.busy}
          onClick={() =>
            action.run(async () => {
              await (await academy).adminChallenge("delete", target!.id);
              setTarget(null);
              resource.refresh();
            }, "Challenge deleted. Historical solves remain.")
          }
        >
          Delete challenge
        </button>
      </Dialog>
    </>
  );
}
const blank: ChallengeDraft = {
  id: "",
  title: "",
  description: "",
  category: "Web",
  difficulty: "Easy",
  points: 100,
  authorName: "",
  published: false,
  solveCount: 0,
  createdAt: 0,
  files: [],
  hints: [],
  flag: "",
  caseInsensitive: false,
};
function Editor() {
  const { id } = useParams(),
    navigate = useNavigate();
  const resource = useResource(`edit-${id || "new"}`, async () =>
    id
      ? ((await (await academy).adminChallenge("read", id)) as ChallengeDraft)
      : { ...blank },
  );
  const [draft, setDraft] = useState<ChallengeDraft>({ ...blank }),
    [dirty, setDirty] = useState(false);
  const action = useAction();
  const saved = useRef(false);
  const blocker = useBlocker(() => dirty && !saved.current);
  useEffect(() => {
    if (resource.data) {
      setDraft(resource.data);
      setDirty(false);
      saved.current = false;
    }
  }, [resource.data]);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    return () => {
      window.removeEventListener("beforeunload", unload);
    };
  }, [dirty]);
  function set<K extends keyof ChallengeDraft>(
    key: K,
    value: ChallengeDraft[K],
  ) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }
  return (
    <>
      <Heading
        title={id ? "Refine the investigation." : "A new question starts here."}
        description="Write a clear brief. Keep the flag private. All hints are free."
      />
      <LoadState resource={resource} />
      {resource.data && (
        <Form
          className="editor"
          onSubmit={() =>
            action.run(async () => {
              const result = await (
                await academy
              ).adminChallenge("save", id, draft);
              saved.current = true;
              setDirty(false);
              navigate("/admin/challenges", {
                state: { notice: "Challenge saved." },
              });
              return result;
            })
          }
        >
          <Field
            label="Challenge title"
            name="title"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            minLength={3}
            maxLength={100}
            required
          />
          <div className="toolbar">
            <div className="field">
              <label htmlFor="category">Category</label>
              <select
                id="category"
                value={draft.category}
                onChange={(e) =>
                  set("category", e.target.value as ChallengeDraft["category"])
                }
              >
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="difficulty">Difficulty</label>
              <select
                id="difficulty"
                value={draft.difficulty}
                onChange={(e) =>
                  set(
                    "difficulty",
                    e.target.value as ChallengeDraft["difficulty"],
                  )
                }
              >
                {difficulties.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <Field
            label="Points"
            name="points"
            type="number"
            min={1}
            max={10000}
            step={1}
            value={draft.points}
            onChange={(e) => set("points", Number(e.target.value))}
            required
          />
          <div className="field">
            <label htmlFor="description">Challenge brief</label>
            <p id="description-hint" className="help">
              Explain the objective and context. Plain text; 10–5,000
              characters.
            </p>
            <textarea
              id="description"
              aria-describedby="description-hint"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              minLength={10}
              maxLength={5000}
              required
            />
          </div>
          <Field
            label="Author"
            name="authorName"
            value={draft.authorName}
            onChange={(e) => set("authorName", e.target.value)}
            maxLength={100}
            required
          />
          <Field
            label="Private flag"
            name="privateFlag"
            value={draft.flag}
            onChange={(e) => set("flag", e.target.value)}
            autoComplete="off"
            spellCheck={false}
            maxLength={2048}
            hint="Visible only to authorized instructors. Never saved in browser drafts."
            required
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.caseInsensitive}
              onChange={(e) => set("caseInsensitive", e.target.checked)}
            />
            Accept upper- and lowercase flag variants
          </label>
          <fieldset>
            <legend>External files</legend>
            {draft.files.map((f, i) => (
              <div className="file-entry" key={i}>
                <Field
                  label={`File ${i + 1} name`}
                  name={`file-name-${i}`}
                  value={f.name}
                  onChange={(e) =>
                    set(
                      "files",
                      draft.files.map((v, n) =>
                        n === i ? { ...v, name: e.target.value } : v,
                      ),
                    )
                  }
                  maxLength={100}
                  required
                />
                <Field
                  label={`File ${i + 1} URL`}
                  name={`file-url-${i}`}
                  type="url"
                  value={f.url}
                  onChange={(e) =>
                    set(
                      "files",
                      draft.files.map((v, n) =>
                        n === i ? { ...v, url: e.target.value } : v,
                      ),
                    )
                  }
                  pattern="https?://.*"
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "files",
                      draft.files.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove file {i + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={draft.files.length >= 20}
              onClick={() =>
                set("files", [...draft.files, { name: "", url: "" }])
              }
            >
              Add file link
            </button>
          </fieldset>
          <fieldset>
            <legend>Free hints</legend>
            {draft.hints.map((h, i) => (
              <div className="file-entry" key={i}>
                <Field
                  label={`Hint ${i + 1}`}
                  name={`hint-${i}`}
                  value={h.text}
                  onChange={(e) =>
                    set(
                      "hints",
                      draft.hints.map((v, n) =>
                        n === i ? { text: e.target.value, cost: 0 } : v,
                      ),
                    )
                  }
                  maxLength={2000}
                  required
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "hints",
                      draft.hints.filter((_, n) => n !== i),
                    )
                  }
                >
                  Remove hint {i + 1}
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={draft.hints.length >= 20}
              onClick={() =>
                set("hints", [...draft.hints, { text: "", cost: 0 }])
              }
            >
              Add free hint
            </button>
          </fieldset>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => set("published", e.target.checked)}
            />
            Publish for learners
          </label>
          <Feedback action={action} />
          <div className="actions">
            <button className="primary" disabled={action.busy}>
              Save challenge
            </button>
            <Link className="button" to="/admin/challenges">
              Cancel editing
            </Link>
          </div>
        </Form>
      )}
      <Dialog
        open={blocker.state === "blocked"}
        title="Discard this draft?"
        onClose={() => blocker.reset?.()}
      >
        <p>
          Your unsaved edits will be lost. Private flags are not stored in
          browser drafts.
        </p>
        <button
          className="danger"
          onClick={() => {
            saved.current = true;
            setDirty(false);
            blocker.proceed?.();
          }}
        >
          Discard edits
        </button>
      </Dialog>
    </>
  );
}
function Students() {
  const { profile } = useSession();
  const resource = useResource("students", async () => {
    const api = await academy;
    let cursor: string | undefined;
    const all: ProfileType[] = [];
    do {
      const result = await api.students(cursor);
      all.push(...result.items);
      cursor = result.cursor || undefined;
      if (all.length > 2000)
        throw new Error(
          "Learner capacity requires review before loading more accounts.",
        );
    } while (cursor);
    return all;
  });
  const action = useAction();
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [target, setTarget] = useState<{
      uid: string;
      name: string;
      action: "role" | "suspend" | "reinstate";
      role?: "admin" | "student";
    } | null>(null);
  const filtered = resource.data?.filter((p) =>
    `${p.displayName} ${p.username} ${p.email}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <>
      <Heading
        title="People behind the discoveries."
        description="Manage access without losing anyone’s learning record."
      />
      <div className="toolbar">
        <Field
          label="Search learners"
          name="learner-search"
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button
          disabled={!resource.data}
          onClick={() =>
            downloadCsv("students.csv", [
              [
                "Display name",
                "Username",
                "Email",
                "Role",
                "Points",
                "Solves",
                "First bloods",
                "Joined",
                "Suspended",
              ],
              ...resource.data!.map((p) => [
                p.displayName,
                p.username,
                p.email,
                p.role,
                p.points,
                p.solves,
                p.firstBloods,
                date(p.createdAt || 0),
                p.suspended,
              ]),
            ])
          }
        >
          Export CSV
        </button>
      </div>
      <LoadState resource={resource} />
      <Feedback action={action} />
      {filtered?.length ? (
        <>
          <div
            className="table-wrap"
            tabIndex={0}
            role="region"
            aria-label="Learner administration table"
          >
            <table>
              <caption>{filtered.length} learners and instructors</caption>
              <thead>
                <tr>
                  <th scope="col">Learner</th>
                  <th scope="col">Points / solves</th>
                  <th scope="col">Role / access</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice((page - 1) * 50, page * 50).map((p) => (
                  <tr key={p.uid}>
                    <th scope="row">
                      {p.displayName}
                      <small>
                        @{p.username} · {p.email}
                      </small>
                    </th>
                    <td>
                      {p.points} / {p.solves}
                    </td>
                    <td>
                      {p.role}
                      <small>{p.suspended ? "Suspended" : "Active"}</small>
                    </td>
                    <td>
                      {p.uid === profile!.uid ? (
                        <span className="help">Your account</span>
                      ) : (
                        <div className="actions">
                          <button
                            disabled={action.busy}
                            onClick={() =>
                              setTarget({
                                uid: p.uid,
                                name: p.displayName,
                                action: "role",
                                role: p.role === "admin" ? "student" : "admin",
                              })
                            }
                          >
                            {p.role === "admin"
                              ? "Make learner"
                              : "Make instructor"}
                          </button>
                          <button
                            disabled={action.busy}
                            onClick={() =>
                              setTarget({
                                uid: p.uid,
                                name: p.displayName,
                                action: p.suspended ? "reinstate" : "suspend",
                              })
                            }
                          >
                            {p.suspended ? "Reinstate" : "Suspend"}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            {page > 1 && (
              <button onClick={() => setPage((p) => p - 1)}>Previous</button>
            )}
            {filtered.length > page * 50 && (
              <button onClick={() => setPage((p) => p + 1)}>Next 50</button>
            )}
          </div>
        </>
      ) : (
        filtered && (
          <Empty title="No matching learners.">
            <button onClick={() => setSearch("")}>Clear search</button>
          </Empty>
        )
      )}
      <Dialog
        open={!!target}
        title={`Change access for ${target?.name || "learner"}?`}
        onClose={() => {
          if (!action.busy) setTarget(null);
        }}
      >
        <p>
          {target?.action === "role"
            ? "This changes instructor privileges, including access to private flags and learner records."
            : target?.action === "suspend"
              ? "This stops platform access. Historical solves and scores remain."
              : "This restores platform access. Historical solves and scores remain."}
        </p>
        <Feedback action={action} />
        <button
          className="danger"
          disabled={action.busy}
          onClick={() =>
            action.run(async () => {
              await (
                await academy
              ).account(target!.uid, target!.action, target!.role);
              setTarget(null);
              resource.refresh();
            }, "Account access updated.")
          }
        >
          {target?.action === "role"
            ? "Change role"
            : target?.action === "suspend"
              ? "Suspend access"
              : "Reinstate access"}
        </button>
      </Dialog>
    </>
  );
}
function Settings() {
  const session = useSession(),
    resource = useResource("settings", async () => (await academy).settings()),
    action = useAction();
  const [repair, setRepair] = useState<Repair | null>(null),
    [confirm, setConfirm] = useState(false);
  return (
    <>
      <Heading
        title="Keep the academy in good order."
        description="Platform settings and deliberate maintenance."
      />
      <LoadState resource={resource} />
      <div className="editor">
        {resource.data && (
          <Form
            onSubmit={(data) =>
              action.run(async () => {
                await (
                  await academy
                ).saveSettings({
                  platformName: String(data.get("platformName")),
                  events: Number(data.get("events")),
                });
              }, "Settings saved.")
            }
          >
            <Field
              label="Platform name"
              name="platformName"
              defaultValue={resource.data.platformName}
              maxLength={80}
              required
            />
            <Field
              label="Event count"
              name="events"
              type="number"
              defaultValue={resource.data.events}
              min={0}
              max={100000}
              required
            />
            <button className="primary" disabled={action.busy}>
              Save settings
            </button>
          </Form>
        )}
        <Feedback action={action} />
        <section className="form-section">
          <h2>Maintenance window</h2>
          <p>
            Maintenance pauses learner access and score writes. Keep a verified
            database export before repairs.
          </p>
          <p>
            Current state:{" "}
            <strong>
              {session.maintenance ? "Maintenance enabled" : "Academy open"}
            </strong>
          </p>
          <button
            disabled={action.busy}
            onClick={() =>
              action.run(async () => {
                await (await academy).maintenance(!session.maintenance);
                setRepair(null);
              }, "Maintenance state updated.")
            }
          >
            {session.maintenance ? "Reopen academy" : "Enable maintenance"}
          </button>
        </section>
        <section className="form-section">
          <h2>Reconcile historical records</h2>
          <p>
            Preview recalculated totals and first bloods before applying. Awards
            use historical solve points. If interrupted, keep maintenance
            enabled and preview again.
          </p>
          <button
            disabled={action.busy || !session.maintenance}
            onClick={() =>
              action.run(async () => {
                setRepair(await (await academy).reconcile());
              })
            }
          >
            Preview reconciliation
          </button>
          {!session.maintenance && (
            <p className="help">
              Enable maintenance to preview or apply repairs.
            </p>
          )}
          {repair && (
            <div className="notice">
              <p>
                {repair.writes} planned document writes · {repair.solves} solves
                · {repair.users} accounts
              </p>
              <details>
                <summary>Review proposed changes</summary>
                <pre className="repair-report">
                  {JSON.stringify(repair.changes || [], null, 2)}
                </pre>
              </details>
              <p className="help">
                Download a verified backup before applying. This changes
                historical aggregates and first-blood attribution.
              </p>
              <button
                disabled={action.busy || !repair.writes}
                onClick={() => setConfirm(true)}
              >
                Review and apply
              </button>
            </div>
          )}
        </section>
      </div>
      <Dialog
        open={confirm}
        title="Apply this reconciliation?"
        onClose={() => {
          if (!action.busy) setConfirm(false);
        }}
      >
        <p>
          This applies {repair?.writes} document writes. Confirm you have a
          verified backup. Maintenance stays enabled until you explicitly
          reopen.
        </p>
        <Feedback action={action} />
        <button
          className="danger"
          disabled={action.busy}
          onClick={() =>
            action.run(async () => {
              await (await academy).reconcile(true, repair!.digest);
              setConfirm(false);
              setRepair(null);
            }, "Reconciliation completed. Verify the results before reopening.")
          }
        >
          Apply reconciliation
        </button>
      </Dialog>
    </>
  );
}
