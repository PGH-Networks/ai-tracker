import "server-only";
import { Visibility } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  assertClientAccess,
  isStaff,
  visibilityWhere,
  type SessionUser,
} from "@/lib/rbac";

export async function listNotes(user: SessionUser, clientId: string) {
  await assertClientAccess(user, clientId);
  return prisma.note.findMany({
    where: { clientId, ...visibilityWhere(user) },
    orderBy: { updatedAt: "desc" },
    include: { author: { select: { name: true, email: true } } },
  });
}

export const noteCreateSchema = z.object({
  clientId: z.string().min(1),
  projectId: z.string().optional().nullable(),
  title: z.string().min(1).max(200),
  body: z.string().default(""),
  meetingDate: z.string().optional().nullable(),
  attendees: z.string().optional().nullable(),
  visibility: z.nativeEnum(Visibility).default(Visibility.INTERNAL),
});

export async function createNote(
  user: SessionUser,
  input: z.infer<typeof noteCreateSchema>
) {
  // Clients are read-mostly — only staff author notes.
  if (!isStaff(user)) throw new AccessError("Only staff can add notes");
  const data = noteCreateSchema.parse(input);
  await assertClientAccess(user, data.clientId);
  return prisma.note.create({
    data: {
      clientId: data.clientId,
      projectId: data.projectId || null,
      title: data.title,
      body: data.body,
      meetingDate: data.meetingDate ? new Date(data.meetingDate) : null,
      attendees: (data.attendees ?? "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      visibility: data.visibility,
      authorId: user.id,
    },
  });
}
