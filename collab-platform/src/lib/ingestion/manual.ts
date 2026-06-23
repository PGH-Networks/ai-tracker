import { RecordProvider, RecordSource } from "@prisma/client";
import type { NormalizedMeeting } from "./types";

export interface ManualMeetingInput {
  title: string;
  meetingDate?: string | null;
  attendees?: string | string[] | null;
  summary?: string | null;
  recordingUrl?: string | null;
  transcriptUrl?: string | null;
  provider?: RecordProvider;
}

/** Normalize a hand-entered Fireflies (or other) record into the shared shape. */
export function normalizeManual(input: ManualMeetingInput): NormalizedMeeting {
  const attendees = Array.isArray(input.attendees)
    ? input.attendees
    : (input.attendees ?? "")
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean);

  return {
    title: input.title.trim(),
    meetingDate: input.meetingDate ? new Date(input.meetingDate) : null,
    attendees,
    summary: input.summary?.trim() || null,
    recordingUrl: input.recordingUrl?.trim() || null,
    transcriptUrl: input.transcriptUrl?.trim() || null,
    transcript: null,
    durationSec: null,
    provider: input.provider ?? RecordProvider.FIREFLIES,
    externalId: null, // manual rows have no external id
  };
}

export const MANUAL_SOURCE = RecordSource.MANUAL;
