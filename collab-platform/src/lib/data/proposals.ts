import "server-only";
import { randomBytes } from "crypto";
import { Prisma, ProposalStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  assertClientAccess,
  canSeeInternalFinancials,
  isStaff,
  type SessionUser,
} from "@/lib/rbac";
import { num } from "@/lib/format";

/** Scope line as shown to the client — sell-side only, no cost/margin. */
export interface ProposalScopeLine {
  role: string;
  description: string | null;
  hours: number;
  amount: number; // hours * sellRate
}
export interface ProposalScope {
  lines: ProposalScopeLine[];
}

export async function listProposals(user: SessionUser, clientId: string) {
  await assertClientAccess(user, clientId);
  const where = isStaff(user)
    ? { project: { clientId } }
    : // clients only see proposals that have been sent/approved
      { project: { clientId }, status: { in: [ProposalStatus.SENT, ProposalStatus.APPROVED] } };
  return prisma.proposal.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { project: { select: { id: true, name: true } } },
  });
}

/** Public, unauthenticated fetch for the shareable link. No cost data exists here. */
export async function getProposalByToken(token: string) {
  if (!token) return null;
  return prisma.proposal.findUnique({
    where: { publicToken: token },
    include: { project: { select: { name: true, client: { select: { name: true } } } } },
  });
}

export const proposalFromEstimateSchema = z.object({
  estimateId: z.string().min(1),
  title: z.string().min(1).max(200),
});

/**
 * Build a client-facing proposal from an internal estimate. Reads costRate to
 * compute nothing client-facing — only sellRate flows into the stored scope and
 * total. Cost/margin stay in the Estimate and never reach the Proposal row.
 */
export async function createProposalFromEstimate(
  user: SessionUser,
  input: z.infer<typeof proposalFromEstimateSchema>
) {
  if (!canSeeInternalFinancials(user))
    throw new AccessError("Only staff can generate proposals");
  const data = proposalFromEstimateSchema.parse(input);

  const estimate = await prisma.estimate.findUnique({
    where: { id: data.estimateId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      project: { select: { id: true, clientId: true } },
    },
  });
  if (!estimate) throw new AccessError("Estimate not found", 404);
  await assertClientAccess(user, estimate.project.clientId);

  const lines: ProposalScopeLine[] = estimate.lineItems.map((l) => ({
    role: l.role,
    description: l.description,
    hours: num(l.hours),
    amount: num(l.hours) * num(l.sellRate), // sell side only
  }));
  const totalPrice = lines.reduce((s, l) => s + l.amount, 0);
  const scope: ProposalScope = { lines };

  return prisma.proposal.create({
    data: {
      projectId: estimate.project.id,
      estimateId: estimate.id,
      title: data.title,
      status: ProposalStatus.DRAFT,
      scope: scope as unknown as Prisma.InputJsonValue,
      totalPrice,
      publicToken: randomBytes(16).toString("hex"),
      createdById: user.id,
    },
  });
}

export async function setProposalStatus(
  user: SessionUser,
  id: string,
  status: ProposalStatus
) {
  if (!isStaff(user)) throw new AccessError("Only staff can change status");
  const p = await prisma.proposal.findUnique({
    where: { id },
    select: { project: { select: { clientId: true } } },
  });
  if (!p) throw new AccessError("Proposal not found", 404);
  await assertClientAccess(user, p.project.clientId);
  return prisma.proposal.update({ where: { id }, data: { status } });
}
