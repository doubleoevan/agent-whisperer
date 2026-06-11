import type { UserId } from "@agent-whisperer/domain";
import type { Database, Transaction } from "./client.ts";
import { eq } from "drizzle-orm";
import { submissionFieldLibrary, type SubmissionFieldLibraryRow } from "./schema/submission-field-library.ts";

/**
 * Reads every saved field-library entry for a user (admin connection; called by activities).
 */
export async function listFieldLibrary(database: Database, input: { userId: UserId }): Promise<SubmissionFieldLibraryRow[]> {
  return database.select().from(submissionFieldLibrary).where(eq(submissionFieldLibrary.userId, input.userId));
}

/**
 * Upserts one (userId, key) -> value entry under the current user transaction.
 */
export async function upsertFieldLibraryEntry(transaction: Transaction, input: { userId: UserId; key: string; value: string }): Promise<void> {
  await transaction
    .insert(submissionFieldLibrary)
    .values({ userId: input.userId, key: input.key, value: input.value })
    .onConflictDoUpdate({
      target: [submissionFieldLibrary.userId, submissionFieldLibrary.key],
      set: { value: input.value, lastUsedAt: new Date() },
    });
}
