import type { AgentId, ManuscriptId, SubmissionId, SubmissionPayload, UserId, WorkflowId } from "@agent-whisperer/domain";
import { sql } from "drizzle-orm";
import { index, jsonb, pgPolicy, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { agents } from "./agents.ts";
import { manuscripts } from "./manuscripts.ts";
import { appRole } from "./roles.ts";
import { users } from "./users.ts";

// one row per (manuscript, agent) submission run; payload is the current copy-paste bundle (letter + composed fields)
export const submissions = pgTable("submissions", {
  id: uuid("id").$type<SubmissionId>().primaryKey().defaultRandom(),
  userId: uuid("user_id").$type<UserId>().notNull().references(() => users.id, { onDelete: "cascade" }),
  manuscriptId: uuid("manuscript_id").$type<ManuscriptId>().notNull().references(() => manuscripts.id, { onDelete: "cascade" }),
  agentId: uuid("agent_id").$type<AgentId>().notNull().references(() => agents.id, { onDelete: "cascade" }),
  // workflow that owns this draft; signals/queries from mcp tools route through it
  workflowId: text("workflow_id").$type<WorkflowId>().notNull().unique(),
  status: text("status").$type<"drafting" | "finalized">().notNull().default("drafting"),
  payload: jsonb("payload").$type<SubmissionPayload>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at", { withTimezone: true }),
}, (table) => [
  index("submissions_user_idx").on(table.userId),
  // a single workflow may be re-driven via signals; the (workflowId) unique above keeps it 1:1 with a row
  uniqueIndex("submissions_user_manuscript_agent_uniq").on(table.userId, table.manuscriptId, table.agentId),
  pgPolicy("submissions_tenant_isolation", {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`${table.userId} = current_setting('app.user_id')::uuid`,
    withCheck: sql`${table.userId} = current_setting('app.user_id')::uuid`,
  }),
]).enableRLS();

export type SubmissionRow = typeof submissions.$inferSelect;
