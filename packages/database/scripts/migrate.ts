import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env["DATABASE_URL_ADMIN"];
if (!url) {
  console.error("DATABASE_URL_ADMIN required (migrations run as the superuser/owner role).");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client);

await migrate(db, { migrationsFolder: "./drizzle" });
await client.end();

console.log("✓ migrations applied");
