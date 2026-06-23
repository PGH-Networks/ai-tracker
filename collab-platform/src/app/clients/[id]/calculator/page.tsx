import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, canSeeInternalFinancials } from "@/lib/rbac";
import { getClient } from "@/lib/data/clients";
import { listProjectTree } from "@/lib/data/projects";
import { listEstimatesForClient, summarize } from "@/lib/data/estimates";
import { AppHeader } from "@/components/AppHeader";
import { money } from "@/lib/format";
import {
  createEstimateAction,
  addLineItemAction,
  createProposalAction,
} from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  // Internal-only: clients can never reach the cost calculator.
  if (!canSeeInternalFinancials(user)) redirect(`/clients/${id}`);

  const client = await getClient(user, id);
  if (!client) notFound();

  const [tree, estimates] = await Promise.all([
    listProjectTree(user, id),
    listEstimatesForClient(user, id),
  ]);
  const allProjects = tree.flatMap((g) => [g, ...g.children]);

  return (
    <>
      <AppHeader user={user} />
      <main className="container">
        <Link href={`/clients/${id}`} className="muted" style={{ fontSize: 13 }}>
          ← {client.name}
        </Link>
        <h2 style={{ margin: "6px 0 0" }}>Project Calculator</h2>
        <p className="muted">
          Internal cost / effort estimation. Cost rates and margin are{" "}
          <strong>never</strong> shown to clients — generate a proposal to share
          sell-side pricing only.
        </p>

        {/* New estimate */}
        <details className="adder" open={estimates.length === 0}>
          <summary>+ New estimate</summary>
          <form action={createEstimateAction} className="pad toolbar">
            <input type="hidden" name="clientId" value={id} />
            <div>
              <label htmlFor="project">Project</label>
              <select id="project" name="projectId" required defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="ename">Name</label>
              <input id="ename" name="name" defaultValue="Estimate" />
            </div>
            <button className="btn btn-sm" type="submit">
              Create
            </button>
          </form>
        </details>

        {estimates.length === 0 && allProjects.length === 0 && (
          <p className="muted">Add a project first, then create an estimate.</p>
        )}

        {estimates.map((est) => {
          const t = summarize(est.lineItems);
          return (
            <section key={est.id} className="card" style={{ marginTop: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>
                  {est.name} · <span className="muted">{est.project.name}</span>
                </h3>
                {est.proposals.length > 0 && (
                  <span className="muted" style={{ fontSize: 12 }}>
                    {est.proposals.length} proposal(s)
                  </span>
                )}
              </div>

              {/* Line items table with cost + margin (internal) */}
              <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 12, fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                    <th style={{ padding: "4px 8px" }}>Role</th>
                    <th style={{ padding: "4px 8px" }}>Hours</th>
                    <th style={{ padding: "4px 8px" }}>Cost/hr</th>
                    <th style={{ padding: "4px 8px" }}>Sell/hr</th>
                    <th style={{ padding: "4px 8px", textAlign: "right" }}>Cost</th>
                    <th style={{ padding: "4px 8px", textAlign: "right" }}>Sell</th>
                  </tr>
                </thead>
                <tbody>
                  {est.lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted" style={{ padding: 8 }}>
                        No line items yet.
                      </td>
                    </tr>
                  ) : (
                    est.lineItems.map((l) => (
                      <tr key={l.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td style={{ padding: "6px 8px" }}>{l.role}</td>
                        <td style={{ padding: "6px 8px" }}>{Number(l.hours)}</td>
                        <td style={{ padding: "6px 8px" }}>{money(l.costRate)}</td>
                        <td style={{ padding: "6px 8px" }}>{money(l.sellRate)}</td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          {money(Number(l.hours) * Number(l.costRate))}
                        </td>
                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                          {money(Number(l.hours) * Number(l.sellRate))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                    <td style={{ padding: "6px 8px" }}>Total</td>
                    <td style={{ padding: "6px 8px" }}>{t.hours}</td>
                    <td colSpan={2} />
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{money(t.cost)}</td>
                    <td style={{ padding: "6px 8px", textAlign: "right" }}>{money(t.sell)}</td>
                  </tr>
                </tfoot>
              </table>

              <p style={{ margin: "8px 0 0", fontSize: 14 }}>
                Margin:{" "}
                <strong style={{ color: t.margin >= 0 ? "#047a3d" : "#b42318" }}>
                  {money(t.margin)} ({t.marginPct.toFixed(0)}%)
                </strong>
              </p>

              {/* Add line item */}
              <details className="adder" style={{ marginTop: 12 }}>
                <summary>+ Add line item</summary>
                <form action={addLineItemAction} className="pad">
                  <input type="hidden" name="clientId" value={id} />
                  <input type="hidden" name="estimateId" value={est.id} />
                  <div className="form-grid">
                    <div>
                      <label htmlFor={`role-${est.id}`}>Role *</label>
                      <input id={`role-${est.id}`} name="role" required />
                    </div>
                    <div>
                      <label>Hours *</label>
                      <input name="hours" type="number" step="0.25" min="0" required />
                    </div>
                    <div>
                      <label>Cost / hr *</label>
                      <input name="costRate" type="number" step="0.01" min="0" required />
                    </div>
                    <div>
                      <label>Sell / hr *</label>
                      <input name="sellRate" type="number" step="0.01" min="0" required />
                    </div>
                    <div className="full">
                      <label>Description</label>
                      <input name="description" />
                    </div>
                  </div>
                  <button className="btn btn-sm" type="submit" style={{ marginTop: 10 }}>
                    Add
                  </button>
                </form>
              </details>

              {/* Generate client proposal (sell-side only) */}
              {est.lineItems.length > 0 && (
                <form action={createProposalAction} className="toolbar" style={{ marginTop: 10 }}>
                  <input type="hidden" name="clientId" value={id} />
                  <input type="hidden" name="estimateId" value={est.id} />
                  <div>
                    <label>Proposal title</label>
                    <input name="title" defaultValue={`${client.name} — ${est.project.name}`} />
                  </div>
                  <button className="btn btn-sm" type="submit">
                    Generate client proposal →
                  </button>
                </form>
              )}

              {est.proposals.length > 0 && (
                <ul style={{ marginTop: 10, fontSize: 14 }}>
                  {est.proposals.map((p) => (
                    <li key={p.id}>
                      {p.title} <span className="pill">{p.status}</span>{" "}
                      {p.publicToken && (
                        <Link href={`/p/${p.publicToken}`} target="_blank">
                          view shareable →
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </main>
    </>
  );
}
