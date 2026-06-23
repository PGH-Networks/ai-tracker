import Link from "next/link";
import { RecordSource } from "@prisma/client";
import { requireUser, isStaff } from "@/lib/rbac";
import { listMeetings } from "@/lib/data/meetings";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

function fmtDate(d: Date | null) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default async function MeetingsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; source?: string; clientId?: string }>;
}) {
  const sp = await searchParams;
  const user = await requireUser();
  const staff = isStaff(user);

  const source =
    sp.source === "MANUAL" || sp.source === "API"
      ? (sp.source as RecordSource)
      : undefined;

  const meetings = await listMeetings(user, {
    q: sp.q,
    source,
    clientId: sp.clientId,
  });

  return (
    <>
      <AppHeader user={user} />
      <main className="container">
        <h2>Meeting Archive</h2>
        <p className="muted">
          Searchable across titles, summaries, and attendees. Source-agnostic —
          hand-entered and (later) Fireflies-API records appear together.
        </p>

        {/* GET form keeps filters in the URL (shareable, server-rendered). */}
        <form method="get" className="toolbar">
          <input type="hidden" name="clientId" defaultValue={sp.clientId ?? ""} />
          <div style={{ flex: 2 }}>
            <label htmlFor="q">Search</label>
            <input id="q" name="q" defaultValue={sp.q ?? ""} placeholder="Search meetings…" />
          </div>
          <div>
            <label htmlFor="source">Source</label>
            <select id="source" name="source" defaultValue={sp.source ?? ""}>
              <option value="">All</option>
              <option value="MANUAL">Manual</option>
              <option value="API">API sync</option>
            </select>
          </div>
          <button className="btn btn-sm" type="submit">
            Filter
          </button>
        </form>

        {meetings.length === 0 ? (
          <p className="muted">No meetings match.</p>
        ) : (
          meetings.map((m) => (
            <div key={m.id} className="list-row">
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <strong>{m.title}</strong>
                  {staff && <span className={`pill ${m.source}`}>{m.source}</span>}
                </div>
                <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                  <Link href={`/clients/${m.client.id}`}>{m.client.name}</Link>
                  {" · "}
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
      </main>
    </>
  );
}
