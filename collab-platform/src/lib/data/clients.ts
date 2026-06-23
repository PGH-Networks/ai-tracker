import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  assertClientAccess,
  clientScopeWhere,
  isStaff,
  type SessionUser,
} from "@/lib/rbac";

/**
 * Every read/write goes through these helpers so RBAC scoping can't be
 * forgotten at a call site. The API routes and server components share them.
 */

export async function listClients(user: SessionUser) {
  const where = await clientScopeWhere(user);
  return prisma.client.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: { _count: { select: { projects: true } } },
  });
}

export async function getClient(user: SessionUser, id: string) {
  await assertClientAccess(user, id);
  return prisma.client.findUnique({
    where: { id },
    include: { projects: { orderBy: { sortOrder: "asc" } } },
  });
}

export const clientCreateSchema = z.object({
  name: z.string().min(1).max(200),
  status: z.enum(["PROSPECT", "ACTIVE", "ARCHIVED"]).optional(),
  industry: z.string().max(120).optional(),
  website: z.string().url().optional().or(z.literal("")),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

export async function createClient(
  user: SessionUser,
  input: z.infer<typeof clientCreateSchema>
) {
  // Only staff create clients; clients never provision other clients.
  if (!isStaff(user)) throw new AccessError("Only staff can create clients");
  const data = clientCreateSchema.parse(input);
  return prisma.client.create({
    data: { ...data, createdById: user.id },
  });
}
