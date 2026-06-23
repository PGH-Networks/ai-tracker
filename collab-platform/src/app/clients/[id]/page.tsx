import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, isStaff } from "@/lib/rbac";
import { getClient } from "@/lib/data/clients";
import { listProjectTree } from "@/lib/data/projects";
import { listNotes } from "@/lib/data/notes";
import { listMeetings } from "@/lib/data/meetings";
import { listQuickLinks } from "@/lib/data/quicklinks";
import { AppHeader } from "@/components/AppHeader";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  createProjectAction,
  createNoteAction,
  createMeetingAction,
  createQuickLinkAction,
  deleteQuickLinkAction,
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
  const [tree, notes, meetings, links] = await Promise.all([
    listProjectTree(user, id),
    listNotes(user, id),
    listMeetings(user, { clientId: id }),
    listQuickLinks(user, id),
  ]);
  const allProjects = tree.flatMap((g) => [g, ...g.children]);

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
      </main>
    </>
  );
}
