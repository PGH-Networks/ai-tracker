import Link from "next/link";
import { requireUser, isStaff } from "@/lib/rbac";
import { listClients } from "@/lib/data/clients";
import { AppHeader } from "@/components/AppHeader";

// Per-user, DB-backed — never prerendered.
export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser();
  const clients = await listClients(user);
  const staff = isStaff(user);

  return (
    <>
      <AppHeader user={user} />
      <main className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2>{staff ? "Clients & Prospects" : "Your Engagements"}</h2>
          {staff && (
            <Link className="btn" href="/clients/new">
              + Add Client
            </Link>
          )}
        </div>

        {clients.length === 0 ? (
          <p className="muted">No clients yet.</p>
        ) : (
          <div className="grid" style={{ marginTop: 18 }}>
            {clients.map((c) => (
              <Link key={c.id} href={`/clients/${c.id}`} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3>{c.name}</h3>
                  <span className={`status ${c.status}`}>{c.status}</span>
                </div>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {c.industry || "—"} · {c._count.projects} project
                  {c._count.projects === 1 ? "" : "s"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
