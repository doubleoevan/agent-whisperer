import { and, asc, eq } from "drizzle-orm";
import type { SubmissionId, UserId } from "@agent-whisperer/domain";
import type { Database } from "./client.ts";
import { submissionFieldHistory, type SubmissionFieldHistoryRow } from "./schema/submission-field-history.ts";

/**
 * Appends one history row (never updates or deletes); called by activities under the admin connection.
 */
export async function appendSubmissionFieldHistoryEntry(database: Database, input: {
  userId: UserId;
  submissionId: SubmissionId;
  fieldPath: string;
  beforeValue: string | null;
  afterValue: string;
  source: "ai_default" | "author_edit";
}): Promise<void> {
  await database.insert(submissionFieldHistory).values({
    userId: input.userId,
    submissionId: input.submissionId,
    fieldPath: input.fieldPath,
    beforeValue: input.beforeValue,
    afterValue: input.afterValue,
    source: input.source,
  });
}

/**
 * Lists every history row for a submission in chronological order; used by smoke tests and the learn-loop later.
 */
export async function listSubmissionFieldHistoryForSubmission(database: Database, input: {
  userId: UserId;
  submissionId: SubmissionId;
}): Promise<SubmissionFieldHistoryRow[]> {
  return database
    .select()
    .from(submissionFieldHistory)
    .where(and(
      eq(submissionFieldHistory.userId, input.userId),
      eq(submissionFieldHistory.submissionId, input.submissionId),
    ))
    .orderBy(asc(submissionFieldHistory.editedAt));
}
