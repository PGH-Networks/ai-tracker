import Link from "next/link";
import { requireUser, isStaff, canSeeInternalFinancials } from "@/lib/rbac";
import { listClients } from "@/lib/data/clients";
import { AppHeader } from "@/components/AppHeader";

// Per-user, DB-backed — never prerendered.
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await requireUser();
  const clients = await listClients(user);

  // What each role sees on the landing page.
  const staff = isStaff(user);

  return (
    <>
      <AppHeader user={user} />
      <main className="container">
        <h2>Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}</h2>
        <p className="muted">
          {staff
            ? "You can manage every client engagement, internal estimates, and financials."
            : "Here are your active engagements with PGH Networks."}
        </p>

        <div className="grid" style={{ marginTop: 18 }}>
          <div className="card">
            <h3>{clients.length}</h3>
            <p className="muted">
              {staff ? "Clients & prospects" : "Your engagements"}
            </p>
            <Link href="/clients">View clients →</Link>
          </div>

          {canSeeInternalFinancials(user) && (
            <div className="card" style={{ borderLeft: "4px solid var(--primary)" }}>
              <h3>Internal</h3>
              <p className="muted">
                Estimates, budgets, and margins — staff only.
              </p>
              <span className="muted" style={{ fontSize: 13 }}>
                Calculator ships in Phase 3
              </span>
            </div>
          )}

          <div className="card" style={{ borderLeft: "4px solid var(--green)" }}>
            <h3>Whiteboards</h3>
            <p className="muted">Real-time collaborative boards per project.</p>
            <span className="muted" style={{ fontSize: 13 }}>
              Phase 4
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
