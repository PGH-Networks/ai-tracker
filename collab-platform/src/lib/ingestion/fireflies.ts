import { RecordProvider, RecordSource } from "@prisma/client";
import type { MeetingIngestionAdapter, NormalizedMeeting } from "./types";

/**
 * Phase 5 placeholder. The Fireflies GraphQL API adapter will live here.
 * It implements the SAME interface as manual entry and will write to the SAME
 * MeetingRecord schema (upsert on provider+externalId). Nothing else changes.
 *
 * Flagged: requires a paid Fireflies plan + API key (FIREFLIES_API_KEY).
 */
export class FirefliesAdapter implements MeetingIngestionAdapter {
  readonly source = RecordSource.API;
  readonly provider = RecordProvider.FIREFLIES;

  constructor(private readonly apiKey = process.env.FIREFLIES_API_KEY) {}

  async fetchMeetings(): Promise<NormalizedMeeting[]> {
    if (!this.apiKey) {
      throw new Error(
        "Fireflies API not configured (Phase 5). Set FIREFLIES_API_KEY."
      );
    }
    // TODO(phase 5): query Fireflies GraphQL, map transcripts -> NormalizedMeeting[].
    return [];
  }
}
