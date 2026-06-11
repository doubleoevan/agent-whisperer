import type { ManuscriptId, ManuscriptSourceKind, UserId } from "@agent-whisperer/domain";
import { and, eq } from "drizzle-orm";
import type { Database } from "./client.ts";
import { manuscripts, type ManuscriptRow } from "./schema/manuscripts.ts";

/**
 * Upserts the manuscript text for a (userId, sourceKind, sourceIdentifier); re-ingest replaces title + text.
 */
export async function upsertManuscript(database: Database, input: {
  userId: UserId;
  sourceKind: ManuscriptSourceKind;
  sourceIdentifier: string;
  title: string;
  text: string;
}): Promise<{ manuscriptId: ManuscriptId }> {
  const [row] = await database
    .insert(manuscripts)
    .values({
      userId: input.userId,
      sourceKind: input.sourceKind,
      sourceIdentifier: input.sourceIdentifier,
      title: input.title,
      text: input.text,
    })
    .onConflictDoUpdate({
      target: [manuscripts.userId, manuscripts.sourceKind, manuscripts.sourceIdentifier],
      set: { title: input.title, text: input.text, ingestedAt: new Date() },
    })
    .returning({ id: manuscripts.id });
  if (!row) {
    throw new Error("upsertManuscript returned no row");
  }
  return { manuscriptId: row.id };
}

/**
 * Reads a single manuscript scoped to userId; returns null if missing.
 */
export async function getManuscript(database: Database, input: { userId: UserId; manuscriptId: ManuscriptId }): Promise<ManuscriptRow | null> {
  const rows = await database
    .select()
    .from(manuscripts)
    .where(and(eq(manuscripts.userId, input.userId), eq(manuscripts.id, input.manuscriptId)))
    .limit(1);
  return rows[0] ?? null;
}
