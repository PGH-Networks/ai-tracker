import type { RecordProvider, RecordSource } from "@prisma/client";

/**
 * The single normalized shape every ingestion path produces — whether a person
 * pastes a Fireflies link by hand (manual) or the Fireflies API syncs it later.
 * The DB schema, search, and UI only ever see `MeetingRecord`, never the source.
 */
export interface NormalizedMeeting {
  title: string;
  meetingDate?: Date | null;
  attendees: string[];
  summary?: string | null;
  recordingUrl?: string | null;
  transcriptUrl?: string | null;
  transcript?: string | null;
  durationSec?: number | null;
  provider: RecordProvider;
  /** Stable provider id — null for manual entries, set for API-synced ones. */
  externalId?: string | null;
}

/**
 * Common interface for every integration. Adding the Fireflies API in Phase 5
 * means implementing this and calling the SAME upsert path the manual entry
 * uses — no schema/search/UI change.
 */
export interface MeetingIngestionAdapter {
  readonly source: RecordSource;
  readonly provider: RecordProvider;
  /** Pull meetings to ingest. Manual adapter yields nothing to "pull". */
  fetchMeetings(): Promise<NormalizedMeeting[]>;
}
