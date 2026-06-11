import type { ManuscriptId, ManuscriptSourceKind, UserId } from "@agent-whisperer/domain";
import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { appRole } from "./roles.ts";
import { users } from "./users.ts";

// stores the full plain text of an ingested manuscript; one row per (userId, sourceKind, sourceIdentifier)
export const manuscripts = pgTable("manuscripts", {
  id: uuid("id").$type<ManuscriptId>().primaryKey().defaultRandom(),
  userId: uuid("user_id").$type<UserId>().notNull().references(() => users.id, { onDelete: "cascade" }),
  // "drive" → composio-exported google doc; "local" → docx read off disk
  sourceKind: text("source_kind").$type<ManuscriptSourceKind>().notNull(),
  // drive file id when sourceKind="drive", absolute local path when sourceKind="local"
  sourceIdentifier: text("source_identifier").notNull(),
  title: text("title").notNull(),
  // full plaintext output of mammoth.extractRawText; no slicing per the days 3-4 decision
  text: text("text").notNull(),
  ingestedAt: timestamp("ingested_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // one row per (user, source-kind, identifier) — re-ingest of the same source replaces via upsert
  uniqueIndex("manuscripts_user_source_uniq").on(table.userId, table.sourceKind, table.sourceIdentifier),
  index("manuscripts_user_idx").on(table.userId),
  pgPolicy("manuscripts_tenant_isolation", {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`${table.userId} = current_setting('app.user_id')::uuid`,
    withCheck: sql`${table.userId} = current_setting('app.user_id')::uuid`,
  }),
]).enableRLS();

export type ManuscriptRow = typeof manuscripts.$inferSelect;
