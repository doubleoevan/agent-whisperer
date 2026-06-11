import type { AgentId, UserId } from "@agent-whisperer/domain";
import { sql } from "drizzle-orm";
import { index, pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appRole } from "./roles.ts";
import { users } from "./users.ts";

// literary agents the author may submit to; v1 is seed-fixture, v2 will be populated by the reedsy/mswl ingest
export const agents = pgTable("agents", {
  id: uuid("id").$type<AgentId>().primaryKey().defaultRandom(),
  userId: uuid("user_id").$type<UserId>().notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  agency: text("agency").notNull(),
  // freeform "what to send" string from the agent's listing
  materials: text("materials").notNull(),
  // how the agent wants the query delivered; informs the composer's payload shape
  queryMethod: text("query_method").notNull(),
  queryUrl: text("query_url"),
  email: text("email"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("agents_user_idx").on(table.userId),
  pgPolicy("agents_tenant_isolation", {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`${table.userId} = current_setting('app.user_id')::uuid`,
    withCheck: sql`${table.userId} = current_setting('app.user_id')::uuid`,
  }),
]).enableRLS();

export type AgentRow = typeof agents.$inferSelect;
