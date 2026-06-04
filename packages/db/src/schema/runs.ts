import type { UserId } from "@agent-whisperer/domain";
import { sql } from "drizzle-orm";
import { pgPolicy, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appRole } from "./roles.ts";
import { users } from "./users.ts";

// placeholder tenant-scoped table; exercises the userId + row-level security shape
export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").$type<UserId>().notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  pgPolicy("runs_tenant_isolation", {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`${table.userId} = current_setting('app.user_id')::uuid`,
    withCheck: sql`${table.userId} = current_setting('app.user_id')::uuid`,
  }),
]).enableRLS();

export type Run = typeof runs.$inferSelect;
