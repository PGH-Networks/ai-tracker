import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  assertClientAccess,
  canSeeInternalFinancials,
  type SessionUser,
} from "@/lib/rbac";
import { num } from "@/lib/format";

/** Guard: the calculator and all cost data are internal-only. */
function assertInternal(user: SessionUser) {
  if (!canSeeInternalFinancials(user))
    throw new AccessError("Internal financials are staff-only");
}

type LineLike = { hours: unknown; costRate: unknown; sellRate: unknown };

/** Roll up an estimate's line items into cost/sell/margin totals. */
export function summarize(lines: LineLike[]) {
  let hours = 0,
    cost = 0,
    sell = 0;
  for (const l of lines) {
    const h = num(l.hours);
    hours += h;
    cost += h * num(l.costRate);
    sell += h * num(l.sellRate);
  }
  const margin = sell - cost;
  const marginPct = sell > 0 ? (margin / sell) * 100 : 0;
  return { hours, cost, sell, margin, marginPct };
}

export async function listEstimates(user: SessionUser, projectId: string) {
  assertInternal(user);
  return prisma.estimate.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
}

/** All estimates across a client's projects (for the calculator overview). */
export async function listEstimatesForClient(user: SessionUser, clientId: string) {
  assertInternal(user);
  await assertClientAccess(user, clientId);
  return prisma.estimate.findMany({
    where: { project: { clientId } },
    orderBy: { createdAt: "desc" },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      project: { select: { id: true, name: true } },
      proposals: { select: { id: true, title: true, status: true, publicToken: true } },
    },
  });
}

export async function getEstimate(user: SessionUser, id: string) {
  assertInternal(user);
  return prisma.estimate.findUnique({
    where: { id },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      project: { select: { id: true, name: true, clientId: true } },
    },
  });
}

export const estimateCreateSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1).max(160).default("Estimate"),
});

export async function createEstimate(
  user: SessionUser,
  input: z.infer<typeof estimateCreateSchema>
) {
  assertInternal(user);
  const data = estimateCreateSchema.parse(input);
  const project = await prisma.project.findUnique({
    where: { id: data.projectId },
    select: { clientId: true },
  });
  if (!project) throw new AccessError("Project not found", 404);
  await assertClientAccess(user, project.clientId);
  return prisma.estimate.create({
    data: { projectId: data.projectId, name: data.name, createdById: user.id },
  });
}

export const lineItemSchema = z.object({
  estimateId: z.string().min(1),
  role: z.string().min(1).max(120),
  description: z.string().optional().nullable(),
  hours: z.coerce.number().nonnegative(),
  costRate: z.coerce.number().nonnegative(),
  sellRate: z.coerce.number().nonnegative(),
});

export async function addLineItem(
  user: SessionUser,
  input: z.infer<typeof lineItemSchema>
) {
  assertInternal(user);
  const data = lineItemSchema.parse(input);
  const count = await prisma.estimateLineItem.count({
    where: { estimateId: data.estimateId },
  });
  return prisma.estimateLineItem.create({
    data: {
      estimateId: data.estimateId,
      role: data.role,
      description: data.description || null,
      hours: data.hours,
      costRate: data.costRate,
      sellRate: data.sellRate,
      sortOrder: count,
    },
  });
}
