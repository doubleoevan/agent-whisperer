import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.ts";

/**
 * Placeholder tenant-scoped table that exercises the userId + RLS pattern from
 * day one. Real domain tables will follow this shape: every row carries
 * `userId`, every query is scoped via `withUser()`, RLS denies cross-tenant
 * access at the DB level.
 */
export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Run = typeof runs.$inferSelect;
