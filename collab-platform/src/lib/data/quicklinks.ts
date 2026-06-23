import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  assertClientAccess,
  isStaff,
  type SessionUser,
} from "@/lib/rbac";

export async function listQuickLinks(user: SessionUser, clientId: string) {
  await assertClientAccess(user, clientId);
  return prisma.quickLink.findMany({
    where: { clientId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export const quickLinkSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  label: z.string().min(1).max(120),
  url: z.string().min(1).max(2048),
});

/** Adds https:// when a scheme is missing (mirrors AI Tracker's hub behavior). */
function ensureScheme(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export async function createQuickLink(
  user: SessionUser,
  input: z.infer<typeof quickLinkSchema>
) {
  if (!isStaff(user)) throw new AccessError("Only staff can add links");
  const data = quickLinkSchema.parse(input);
  await assertClientAccess(user, data.clientId);
  return prisma.quickLink.create({
    data: {
      clientId: data.clientId,
      projectId: data.projectId || null,
      label: data.label,
      url: ensureScheme(data.url),
      createdById: user.id,
    },
  });
}

export async function deleteQuickLink(user: SessionUser, id: string) {
  if (!isStaff(user)) throw new AccessError("Only staff can remove links");
  const link = await prisma.quickLink.findUnique({
    where: { id },
    select: { clientId: true },
  });
  if (!link?.clientId) throw new AccessError("Link not found", 404);
  await assertClientAccess(user, link.clientId);
  await prisma.quickLink.delete({ where: { id } });
}
