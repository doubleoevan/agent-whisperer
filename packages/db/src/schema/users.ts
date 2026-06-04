import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Tenant root. Not RLS-protected — the row identifying the user can't depend
 * on the user already being identified. The `app` role gets SELECT only; all
 * writes go through migrations or admin-role code.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
