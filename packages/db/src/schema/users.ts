import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// tenant root; row-level security does not apply, app role has SELECT only
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
