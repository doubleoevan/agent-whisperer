import type { UserId, WorkflowId } from "@agent-whisperer/domain";
import { sql } from "drizzle-orm";
import { index, jsonb, integer, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appRole } from "./roles.ts";
import { users } from "./users.ts";

// state machine: pending -> claimed -> { processed | failed }; settledAt set on terminal
export const outbox = pgTable("outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").$type<UserId>().notNull().references(() => users.id, { onDelete: "cascade" }),
  workflowType: text("workflow_type").notNull(),
  // globally unique by construction: enqueueWorkflow builds it as `${type}-${userId}-${key}`
  workflowId: text("workflow_id").$type<WorkflowId>().notNull().unique(),
  input: jsonb("input").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  settledAt: timestamp("settled_at", { withTimezone: true }),
}, (table) => [
  index("outbox_pending_idx").on(table.createdAt).where(sql`${table.status} = 'pending'`),
  pgPolicy("outbox_tenant_isolation", {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`${table.userId} = current_setting('app.user_id')::uuid`,
    withCheck: sql`${table.userId} = current_setting('app.user_id')::uuid`,
  }),
]).enableRLS();

export type OutboxRow = typeof outbox.$inferSelect;
