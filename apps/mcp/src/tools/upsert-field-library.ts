import { z } from "zod";
import { upsertFieldLibraryEntry, V1_USER_ID, withUser, type Database } from "@agent-whisperer/database";

export const upsertFieldLibraryInputSchema = {
  key: z.string().min(1).describe("Field key (snake_case identifier — e.g. \"favorite_book\", \"why_us\")"),
  value: z.string().describe("Saved answer the composer will prefill when an agent's intake asks for this key"),
};

export type UpsertFieldLibraryInput = {
  key: string;
  value: string;
};

/**
 * Inserts or updates one saved answer in the v1 user's submission-field library.
 */
export async function upsertFieldLibrary(database: Database, input: UpsertFieldLibraryInput): Promise<{ key: string }> {
  await withUser(database, V1_USER_ID, (transaction) =>
    upsertFieldLibraryEntry(transaction, { userId: V1_USER_ID, key: input.key, value: input.value }),
  );
  return { key: input.key };
}
