import { defineConfig } from "drizzle-kit";

const adminUrl = process.env["DATABASE_URL_ADMIN"];
if (!adminUrl) {
  throw new Error("DATABASE_URL_ADMIN is required for drizzle-kit (migrations run as the superuser/owner role).");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: adminUrl },
  strict: true,
  verbose: true,
});
