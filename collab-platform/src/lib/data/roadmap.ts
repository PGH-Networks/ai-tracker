import "server-only";
import { RoadmapStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  assertClientAccess,
  isStaff,
  type SessionUser,
} from "@/lib/rbac";

/** Roadmap items for a client. Clients see them, but NOT internalOnly budget. */
export async function listRoadmap(user: SessionUser, clientId: string) {
  await assertClientAccess(user, clientId);
  const items = await prisma.roadmapItem.findMany({
    where: { clientId },
    orderBy: [{ sortOrder: "asc" }, { startDate: "asc" }, { createdAt: "asc" }],
    include: {
      budgetItems: true,
      project: { select: { id: true, name: true } },
    },
  });
  if (isStaff(user)) return items;
  // Strip internal-only budget lines for client-facing roadmap.
  return items.map((i) => ({
    ...i,
    budgetItems: i.budgetItems.filter((b) => !b.internalOnly),
  }));
}

export const roadmapItemSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(RoadmapStatus).default(RoadmapStatus.PLANNED),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

export async function createRoadmapItem(
  user: SessionUser,
  input: z.infer<typeof roadmapItemSchema>
) {
  if (!isStaff(user)) throw new AccessError("Only staff can edit the roadmap");
  const data = roadmapItemSchema.parse(input);
  await assertClientAccess(user, data.clientId);
  return prisma.roadmapItem.create({
    data: {
      clientId: data.clientId,
      projectId: data.projectId || null,
      title: data.title,
      description: data.description || null,
      status: data.status,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
}

export const budgetItemSchema = z.object({
  roadmapItemId: z.string().min(1),
  label: z.string().min(1).max(160),
  amount: z.coerce.number().nonnegative(),
  internalOnly: z.boolean().default(false),
});

export async function createBudgetItem(
  user: SessionUser,
  input: z.infer<typeof budgetItemSchema>
) {
  if (!isStaff(user)) throw new AccessError("Only staff can edit budgets");
  const data = budgetItemSchema.parse(input);
  const item = await prisma.roadmapItem.findUnique({
    where: { id: data.roadmapItemId },
    select: { clientId: true },
  });
  if (!item) throw new AccessError("Roadmap item not found", 404);
  await assertClientAccess(user, item.clientId);
  return prisma.budgetItem.create({
    data: {
      roadmapItemId: data.roadmapItemId,
      label: data.label,
      amount: data.amount,
      internalOnly: data.internalOnly,
    },
  });
}
