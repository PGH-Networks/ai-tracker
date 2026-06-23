import { notFound } from "next/navigation";
import { getProposalByToken, type ProposalScope } from "@/lib/data/proposals";
import { money } from "@/lib/format";

export const dynamic = "force-dynamic";

// Public shareable proposal. No auth (allowed in @/auth `authorized`), and the
// underlying row carries only sell-side numbers — no cost/margin exists here.
export default async function PublicProposal({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const proposal = await getProposalByToken(token);
  if (!proposal) notFound();

  const scope = (proposal.scope as unknown as ProposalScope) ?? { lines: [] };

  return (
    <div style={{ background: "#f6f8fb", minHeight: "100vh", padding: "40px 16px" }}>
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          background: "#fff",
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      >
        <div style={{ background: "var(--primary)", color: "#fff", padding: "28px 32px" }}>
          <div style={{ fontSize: 13, opacity: 0.8, letterSpacing: "0.04em" }}>
            PGH NETWORKS · PROPOSAL
          </div>
          <h1 style={{ margin: "6px 0 0", color: "#fff" }}>{proposal.title}</h1>
          <div style={{ marginTop: 6, opacity: 0.9, fontSize: 14 }}>
            {proposal.project.client.name} · {proposal.project.name}
          </div>
        </div>

        <div style={{ padding: "28px 32px" }}>
          <h3 style={{ marginTop: 0 }}>Scope of work</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                <th style={{ padding: "6px 8px" }}>Item</th>
                <th style={{ padding: "6px 8px" }}>Hours</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Investment</th>
              </tr>
            </thead>
            <tbody>
              {scope.lines.map((l, i) => (
                <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px" }}>
                    <strong>{l.role}</strong>
                    {l.description && (
                      <div className="muted" style={{ fontSize: 13 }}>
                        {l.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "8px" }}>{l.hours}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>{money(l.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--primary)", fontWeight: 700, fontSize: 16 }}>
                <td style={{ padding: "10px 8px" }} colSpan={2}>
                  Total investment
                </td>
                <td style={{ padding: "10px 8px", textAlign: "right" }}>
                  {money(proposal.totalPrice)}
                </td>
              </tr>
            </tfoot>
          </table>

          <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>
            Prepared by PGH Networks. This proposal is confidential.
          </p>
        </div>
      </div>
    </div>
  );
}
