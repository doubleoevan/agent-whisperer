import type { SubmissionId, UserId } from "@agent-whisperer/domain";
import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appRole } from "./roles.ts";
import { submissions } from "./submissions.ts";
import { users } from "./users.ts";

// append-only log of every edit applied to a submission; never updated or deleted at the app layer
// `fieldPath` is "letter" for the full rendered query letter or a submission-field key for form-field edits
// `beforeValue` is null on the baseline ai_default row that captures the initial letter
export const submissionFieldHistory = pgTable("submission_field_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").$type<UserId>().notNull().references(() => users.id, { onDelete: "cascade" }),
  submissionId: uuid("submission_id").$type<SubmissionId>().notNull().references(() => submissions.id, { onDelete: "cascade" }),
  fieldPath: text("field_path").notNull(),
  beforeValue: text("before_value"),
  afterValue: text("after_value").notNull(),
  source: text("source").$type<"ai_default" | "author_edit">().notNull(),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // chronological reads per submission drive the timeline view the learn-loop will use later
  index("submission_field_history_submission_idx").on(table.submissionId, table.editedAt),
  index("submission_field_history_user_idx").on(table.userId),
  pgPolicy("submission_field_history_tenant_isolation", {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`${table.userId} = current_setting('app.user_id')::uuid`,
    withCheck: sql`${table.userId} = current_setting('app.user_id')::uuid`,
  }),
]).enableRLS();

export type SubmissionFieldHistoryRow = typeof submissionFieldHistory.$inferSelect;
