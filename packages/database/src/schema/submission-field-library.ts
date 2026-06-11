import type { UserId } from "@agent-whisperer/domain";
import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { appRole } from "./roles.ts";
import { users } from "./users.ts";

// past answers keyed by field name (e.g. "favorite_book", "why_us"); composer prefills from here when an agent asks
export const submissionFieldLibrary = pgTable("submission_field_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").$type<UserId>().notNull().references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  value: text("value").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("submission_field_library_user_key_uniq").on(table.userId, table.key),
  index("submission_field_library_user_idx").on(table.userId),
  pgPolicy("submission_field_library_tenant_isolation", {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`${table.userId} = current_setting('app.user_id')::uuid`,
    withCheck: sql`${table.userId} = current_setting('app.user_id')::uuid`,
  }),
]).enableRLS();

export type SubmissionFieldLibraryRow = typeof submissionFieldLibrary.$inferSelect;
