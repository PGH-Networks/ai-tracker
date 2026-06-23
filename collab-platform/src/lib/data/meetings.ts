import "server-only";
import { Prisma, RecordSource, type RecordProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AccessError,
  accessibleClientIds,
  assertClientAccess,
  isStaff,
  visibilityWhere,
  type SessionUser,
} from "@/lib/rbac";
import type { NormalizedMeeting } from "@/lib/ingestion/types";
import { normalizeManual, MANUAL_SOURCE, type ManualMeetingInput } from "@/lib/ingestion/manual";

export interface MeetingFilter {
  clientId?: string;
  q?: string;
  source?: RecordSource;
}

/** Searchable, RBAC-scoped archive. Source-agnostic: manual + API rows alike. */
export async function listMeetings(user: SessionUser, filter: MeetingFilter = {}) {
  const where: Prisma.MeetingRecordWhereInput = { ...visibilityWhere(user) };

  // Scope to clients the user may access.
  const ids = await accessibleClientIds(user);
  if (filter.clientId) {
    await assertClientAccess(user, filter.clientId);
    where.clientId = filter.clientId;
  } else if (ids !== "all") {
    where.clientId = { in: ids };
  }

  if (filter.source) where.source = filter.source;

  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { summary: { contains: q, mode: "insensitive" } },
      { attendees: { has: q } },
    ];
  }

  return prisma.meetingRecord.findMany({
    where,
    orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }],
    include: { client: { select: { id: true, name: true } } },
  });
}

/** Create a hand-entered record. Goes through the SAME normalize path as API. */
export async function createManualMeeting(
  user: SessionUser,
  clientId: string,
  input: ManualMeetingInput & { projectId?: string | null }
) {
  if (!isStaff(user)) throw new AccessError("Only staff can add meeting records");
  await assertClientAccess(user, clientId);
  const norm = normalizeManual(input);
  return prisma.meetingRecord.create({
    data: toCreateData(norm, {
      clientId,
      projectId: input.projectId || null,
      source: MANUAL_SOURCE,
      createdById: user.id,
    }),
  });
}

/**
 * The path a future Fireflies sync will call. Upserts on (provider, externalId)
 * so an API sync never duplicates a manually entered row. Not exposed in the UI.
 */
export async function upsertExternalMeeting(
  norm: NormalizedMeeting,
  meta: { clientId: string; projectId?: string | null; provider: RecordProvider }
) {
  if (!norm.externalId) throw new Error("externalId required for API upsert");
  const base = toCreateData(norm, {
    clientId: meta.clientId,
    projectId: meta.projectId ?? null,
    source: RecordSource.API,
    createdById: null,
  });
  return prisma.meetingRecord.upsert({
    where: { provider_externalId: { provider: meta.provider, externalId: norm.externalId } },
    create: base,
    update: { ...base, syncedAt: new Date() },
  });
}

function toCreateData(
  norm: NormalizedMeeting,
  meta: { clientId: string; projectId: string | null; source: RecordSource; createdById: string | null }
): Prisma.MeetingRecordUncheckedCreateInput {
  return {
    clientId: meta.clientId,
    projectId: meta.projectId,
    title: norm.title,
    meetingDate: norm.meetingDate ?? null,
    attendees: norm.attendees,
    summary: norm.summary ?? null,
    recordingUrl: norm.recordingUrl ?? null,
    transcriptUrl: norm.transcriptUrl ?? null,
    transcript: norm.transcript ?? null,
    durationSec: norm.durationSec ?? null,
    provider: norm.provider,
    externalId: norm.externalId ?? null,
    source: meta.source,
    syncedAt: meta.source === RecordSource.API ? new Date() : null,
    createdById: meta.createdById,
  };
}
