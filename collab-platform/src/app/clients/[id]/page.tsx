import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isStaff } from "@/lib/rbac";
import { getClient } from "@/lib/data/clients";
import { listProjectTree } from "@/lib/data/projects";
import { listNotes } from "@/lib/data/notes";
import { listMeetings } from "@/lib/data/meetings";
import { listQuickLinks } from "@/lib/data/quicklinks";
import { listRoadmap } from "@/lib/data/roadmap";
import { listProposals } from "@/lib/data/proposals";
import { AppHeader } from "@/components/AppHeader";
import { RichTextEditor } from "@/components/RichTextEditor";
import { money } from "@/lib/format";
import {
  createProjectAction,
  createNoteAction,
  createMeetingAction,
  createQuickLinkAction,
  deleteQuickLinkAction,
  createRoadmapItemAction,
  createBudgetItemAction,
  setProposalStatusAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default async function ClientDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const client = await getClient(user, id);
  if (!client) notFound();

  const staff = isStaff(user);
  const [tree, notes, meetings, links, roadmap, proposals] = await Promise.all([
    listProjectTree(user, id),
    listNotes(user, id),
    listMeetings(user, { clientId: id }),
    listQuickLinks(user, id),
    listRoadmap(user, id),
    listProposals(user, id),
  ]);
  const allProjects = tree.flatMap((g) => [g, ...g.children]);

  // Simple Gantt scale across dated roadmap items.
  const dated = roadmap.filter((r) => r.startDate && r.endDate);
  const tMin = dated.length
    ? Math.min(...dated.map((r) => new Date(r.startDate!).getTime()))
    : 0;
  const tMax = dated.length
    ? Math.max(...dated.map((r) => new Date(r.endDate!).getTime()))
    : 0;
  const span = tMax - tMin || 1;
  const pct = (t: number) => `${((t - tMin) / span) * 100}%`;

  return (
    <>
      <AppHeader user={user} />
      <main className="container">
        <Link href="/clients" className="muted" style={{ fontSize: 13 }}>
          ← All clients
        </Link>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 6,
          }}
        >
          <h2 style={{ margin: 0 }}>{client.name}</h2>
          <span className={`status ${client.status}`}>{client.status}</span>
        </div>
        <p className="muted" style={{ marginTop: 6 }}>
          {client.industry || "—"}
          {client.contactName ? ` · ${client.contactName}` : ""}
          {client.contactEmail ? ` · ${client.contactEmail}` : ""}
        </p>

        {staff && (
          <div style={{ marginTop: 10 }}>
            <Link className="btn btn-sm" href={`/clients/${id}/calculator`}>
              Open project calculator →
            </Link>
          </div>
        )}

        {/* ---------------- Projects (nested) ---------------- */}
        <section className="section">
          <div className="section-head">
            <h3>Goals · Projects · Initiatives</h3>
          </div>

          {staff && (
            <details className="adder">
              <summary>+ Add a goal / project / initiative</summary>
              <form action={createProjectAction} className="pad">
                <input type="hidden" name="clientId" value={id} />
                <div className="form-grid">
                  <div>
                    <label htmlFor="kind">Type</label>
                    <select id="kind" name="kind" defaultValue="PROJECT">
                      <option value="GOAL">Goal</option>
                      <option value="PROJECT">Project</option>
                      <option value="INITIATIVE">Initiative</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="parentId">Nest under</label>
                    <select id="parentId" name="parentId" defaultValue="">
                      <option value="">— top level —</option>
                      {allProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="full">
                    <label htmlFor="pname">Name *</label>
                    <input id="pname" name="name" required />
                  </div>
                  <div className="full">
                    <label htmlFor="pdesc">Description</label>
                    <textarea id="pdesc" name="description" rows={2} />
                  </div>
                </div>
                <button className="btn btn-sm" type="submit" style={{ marginTop: 12 }}>
                  Add
                </button>
              </form>
            </details>
          )}

          {tree.length === 0 ? (
            <p className="muted">No projects yet.</p>
          ) : (
            tree.map((goal) => (
              <div key={goal.id} className="list-row" style={{ flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span className="pill">{goal.kind}</span>
                  <strong>{goal.name}</strong>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {goal.status}
                  </span>
                </div>
                {goal.description && (
                  <p className="muted" style={{ margin: "4px 0 0" }}>
                    {goal.description}
                  </p>
                )}
                {goal.children.length > 0 && (
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {goal.children.map((c) => (
                      <li key={c.id} style={{ marginBottom: 4 }}>
                        <span className="pill">{c.kind}</span> {c.name}{" "}
                        <span className="muted" style={{ fontSize: 12 }}>
                          {c.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </section>

        {/* ---------------- Roadmap (timeline + budgets) ---------------- */}
        <section className="section">
          <div className="section-head">
            <h3>Roadmap</h3>
          </div>

          {staff && (
            <details className="adder">
              <summary>+ Add a roadmap item</summary>
              <form action={createRoadmapItemAction} className="pad">
                <input type="hidden" name="clientId" value={id} />
                <div className="form-grid">
                  <div className="full">
                    <label htmlFor="rtitle">Title *</label>
                    <input id="rtitle" name="title" required />
                  </div>
                  <div>
                    <label htmlFor="rstatus">Status</label>
                    <select id="rstatus" name="status" defaultValue="PLANNED">
                      <option value="PLANNED">Planned</option>
                      <option value="IN_PROGRESS">In progress</option>
                      <option value="DONE">Done</option>
                      <option value="AT_RISK">At risk</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rproject">Project</label>
                    <select id="rproject" name="projectId" defaultValue="">
                      <option value="">— none —</option>
                      {allProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rstart">Start</label>
                    <input id="rstart" name="startDate" type="date" />
                  </div>
                  <div>
                    <label htmlFor="rend">End</label>
                    <input id="rend" name="endDate" type="date" />
                  </div>
                </div>
                <button className="btn btn-sm" type="submit" style={{ marginTop: 10 }}>
                  Add
                </button>
              </form>
            </details>
          )}

          {roadmap.length === 0 ? (
            <p className="muted">No roadmap items yet.</p>
          ) : (
            roadmap.map((r) => {
              const budgetTotal = r.budgetItems.reduce(
                (s, b) => s + Number(b.amount),
                0
              );
              return (
                <div key={r.id} className="list-row" style={{ flexDirection: "column" }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
                    <strong>{r.title}</strong>
                    <span className="muted" style={{ fontSize: 12 }}>
                      {r.status}
                    </span>
                    {r.project && (
                      <span className="pill">{r.project.name}</span>
                    )}
                    <span className="muted" style={{ fontSize: 12, marginLeft: "auto" }}>
                      {fmtDate(r.startDate)} → {fmtDate(r.endDate)}
                    </span>
                  </div>

                  {/* Gantt bar */}
                  {r.startDate && r.endDate && (
                    <div
                      style={{
                        position: "relative",
                        height: 10,
                        background: "#eef1f5",
                        borderRadius: 6,
                        margin: "8px 0",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: pct(new Date(r.startDate).getTime()),
                          width: `calc(${pct(new Date(r.endDate).getTime())} - ${pct(new Date(r.startDate).getTime())})`,
                          minWidth: 4,
                          top: 0,
                          bottom: 0,
                          background: "var(--primary)",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                  )}

                  {/* Budget lines (internal-only already stripped for clients) */}
                  {r.budgetItems.length > 0 && (
                    <div style={{ fontSize: 13, width: "100%" }}>
                      {r.budgetItems.map((b) => (
                        <div
                          key={b.id}
                          style={{ display: "flex", justifyContent: "space-between" }}
                        >
                          <span>
                            {b.label}
                            {staff && b.internalOnly && (
                              <span className="pill INTERNAL" style={{ marginLeft: 6 }}>
                                internal
                              </span>
                            )}
                          </span>
                          <span>{money(b.amount)}</span>
                        </div>
                      ))}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontWeight: 700,
                          borderTop: "1px solid var(--border)",
                          marginTop: 4,
                          paddingTop: 4,
                        }}
                      >
                        <span>Budget</span>
                        <span>{money(budgetTotal)}</span>
                      </div>
                    </div>
                  )}

                  {staff && (
                    <form action={createBudgetItemAction} className="toolbar" style={{ marginTop: 6 }}>
                      <input type="hidden" name="clientId" value={id} />
                      <input type="hidden" name="roadmapItemId" value={r.id} />
                      <div>
                        <label>Budget line</label>
                        <input name="label" placeholder="e.g. Implementation" required />
                      </div>
                      <div style={{ maxWidth: 120 }}>
                        <label>Amount</label>
                        <input name="amount" type="number" step="0.01" min="0" required />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                        <input type="checkbox" name="internalOnly" style={{ width: "auto" }} />
                        internal only
                      </label>
                      <button className="btn btn-sm" type="submit">
                        Add
                      </button>
                    </form>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* ---------------- Notes ---------------- */}
        <section className="section">
          <div className="section-head">
            <h3>Notes</h3>
          </div>

          {staff && (
            <details className="adder">
              <summary>+ Add a note</summary>
              <form action={createNoteAction} className="pad">
                <input type="hidden" name="clientId" value={id} />
                <div className="form-grid">
                  <div className="full">
                    <label htmlFor="ntitle">Title *</label>
                    <input id="ntitle" name="title" required />
                  </div>
                  <div>
                    <label htmlFor="nproject">Project</label>
                    <select id="nproject" name="projectId" defaultValue="">
                      <option value="">— none —</option>
                      {allProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="nvis">Visibility</label>
                    <select id="nvis" name="visibility" defaultValue="INTERNAL">
                      <option value="INTERNAL">Internal only</option>
                      <option value="CLIENT_VISIBLE">Client-visible</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="ndate">Meeting date</label>
                    <input id="ndate" name="meetingDate" type="date" />
                  </div>
                  <div>
                    <label htmlFor="natt">Attendees (comma-sep)</label>
                    <input id="natt" name="attendees" />
                  </div>
                  <div className="full">
                    <label>Body</label>
                    <RichTextEditor name="body" placeholder="Write the note…" />
                  </div>
                </div>
                <button className="btn btn-sm" type="submit" style={{ marginTop: 12 }}>
                  Save note
                </button>
              </form>
            </details>
          )}

          {notes.length === 0 ? (
            <p className="muted">No notes visible to you.</p>
          ) : (
            notes.map((n) => (
              <div key={n.id} className="list-row" style={{ flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong>{n.title}</strong>
                  {staff && <span className={`pill ${n.visibility}`}>{n.visibility}</span>}
                  <span className="muted" style={{ fontSize: 12 }}>
                    {fmtDate(n.meetingDate)}
                  </span>
                </div>
                <div
                  className="note-body"
                  dangerouslySetInnerHTML={{ __html: n.body }}
                />
                {n.attendees.length > 0 && (
                  <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                    {n.attendees.join(", ")}
                  </p>
                )}
              </div>
            ))
          )}
        </section>

        {/* ---------------- Fireflies / meeting records ---------------- */}
        <section className="section">
          <div className="section-head">
            <h3>Meeting recordings (Fireflies)</h3>
            <Link href={`/meetings?clientId=${id}`} style={{ fontSize: 13 }}>
              Search archive →
            </Link>
          </div>

          {staff && (
            <details className="adder">
              <summary>+ Add a Fireflies recording (paste links)</summary>
              <form action={createMeetingAction} className="pad">
                <input type="hidden" name="clientId" value={id} />
                <div className="form-grid">
                  <div className="full">
                    <label htmlFor="mtitle">Title *</label>
                    <input id="mtitle" name="title" required />
                  </div>
                  <div>
                    <label htmlFor="mdate">Date</label>
                    <input id="mdate" name="meetingDate" type="date" />
                  </div>
                  <div>
                    <label htmlFor="matt">Attendees (comma-sep)</label>
                    <input id="matt" name="attendees" />
                  </div>
                  <div>
                    <label htmlFor="mrec">Recording URL</label>
                    <input id="mrec" name="recordingUrl" placeholder="https://app.fireflies.ai/view/…" />
                  </div>
                  <div>
                    <label htmlFor="mtr">Transcript URL</label>
                    <input id="mtr" name="transcriptUrl" placeholder="https://…" />
                  </div>
                  <div className="full">
                    <label htmlFor="msum">Summary / notes</label>
                    <textarea id="msum" name="summary" rows={2} />
                  </div>
                </div>
                <button className="btn btn-sm" type="submit" style={{ marginTop: 12 }}>
                  Add recording
                </button>
              </form>
            </details>
          )}

          {meetings.length === 0 ? (
            <p className="muted">No meeting records visible to you.</p>
          ) : (
            meetings.map((m) => (
              <div key={m.id} className="list-row">
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong>{m.title}</strong>
                    <span className={`pill ${m.source}`}>{m.source}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                    {fmtDate(m.meetingDate)}
                    {m.attendees.length ? ` · ${m.attendees.join(", ")}` : ""}
                  </p>
                  {m.summary && (
                    <p style={{ fontSize: 14, margin: "6px 0 0" }}>{m.summary}</p>
                  )}
                </div>
                <div style={{ whiteSpace: "nowrap", display: "flex", gap: 10 }}>
                  {m.recordingUrl && (
                    <a href={m.recordingUrl} target="_blank" rel="noreferrer">
                      ▶ Recording
                    </a>
                  )}
                  {m.transcriptUrl && (
                    <a href={m.transcriptUrl} target="_blank" rel="noreferrer">
                      ☰ Transcript
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

        {/* ---------------- Quick links ---------------- */}
        <section className="section">
          <div className="section-head">
            <h3>Quick links</h3>
          </div>

          {staff && (
            <form
              action={createQuickLinkAction}
              className="toolbar"
              style={{ marginBottom: 16 }}
            >
              <input type="hidden" name="clientId" value={id} />
              <div>
                <label htmlFor="qlabel">Label</label>
                <input id="qlabel" name="label" required />
              </div>
              <div>
                <label htmlFor="qurl">URL</label>
                <input id="qurl" name="url" required placeholder="docs.google.com/…" />
              </div>
              <button className="btn btn-sm" type="submit">
                Add link
              </button>
            </form>
          )}

          {links.length === 0 ? (
            <p className="muted">No links yet.</p>
          ) : (
            <div className="grid">
              {links.map((l) => (
                <div key={l.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <a href={l.url} target="_blank" rel="noreferrer">
                    {l.label}
                  </a>
                  {staff && (
                    <form action={deleteQuickLinkAction}>
                      <input type="hidden" name="clientId" value={id} />
                      <input type="hidden" name="id" value={l.id} />
                      <button className="btn btn-sm btn-danger" type="submit">
                        Remove
                      </button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
        {/* ---------------- Proposals ---------------- */}
        <section className="section">
          <div className="section-head">
            <h3>Proposals</h3>
            {staff && (
              <Link href={`/clients/${id}/calculator`} style={{ fontSize: 13 }}>
                Generate from calculator →
              </Link>
            )}
          </div>

          {proposals.length === 0 ? (
            <p className="muted">
              {staff
                ? "No proposals yet — build an estimate in the calculator, then generate one."
                : "No proposals shared with you yet."}
            </p>
          ) : (
            proposals.map((p) => (
              <div key={p.id} className="list-row">
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong>{p.title}</strong>
                    <span className="pill">{p.status}</span>
                  </div>
                  <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                    {p.project.name} · {money(p.totalPrice)}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {p.publicToken && (
                    <a href={`/p/${p.publicToken}`} target="_blank" rel="noreferrer">
                      View →
                    </a>
                  )}
                  {staff && (
                    <form action={setProposalStatusAction}>
                      <input type="hidden" name="clientId" value={id} />
                      <input type="hidden" name="id" value={p.id} />
                      <select
                        name="status"
                        defaultValue={p.status}
                        style={{ width: "auto", padding: "4px 8px", fontSize: 13 }}
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="SENT">Sent</option>
                        <option value="APPROVED">Approved</option>
                        <option value="DECLINED">Declined</option>
                      </select>
                      <button className="btn btn-sm" type="submit" style={{ marginLeft: 6 }}>
                        Update
                      </button>
                    </form>
                  )}
                </div>
              </div>
            ))
          )}
        </section>

      </main>
    </>
  );
}
