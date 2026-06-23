import "server-only";
import { ProjectKind, ProjectStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  assertClientAccess,
  isStaff,
  type SessionUser,
} from "@/lib/rbac";

/** Top-level projects (goals) for a client, with their nested children. */
export async function listProjectTree(user: SessionUser, clientId: string) {
  await assertClientAccess(user, clientId);
  return prisma.project.findMany({
    where: { clientId, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      owner: { select: { name: true, email: true } },
      children: {
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: { owner: { select: { name: true, email: true } } },
      },
    },
  });
}

export const projectCreateSchema = z.object({
  clientId: z.string().min(1),
  parentId: z.string().optional().nullable(),
  kind: z.nativeEnum(ProjectKind).default(ProjectKind.PROJECT),
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).default(ProjectStatus.PLANNED),
});

export async function createProject(
  user: SessionUser,
  input: z.infer<typeof projectCreateSchema>
) {
  if (!isStaff(user)) throw new AccessError("Only staff can add projects");
  const data = projectCreateSchema.parse(input);
  await assertClientAccess(user, data.clientId);
  return prisma.project.create({
    data: {
      clientId: data.clientId,
      parentId: data.parentId || null,
      kind: data.kind,
      name: data.name,
      description: data.description || null,
      status: data.status,
    },
  });
}
