/**
 * RLS smoke test. Proves three things:
 *  1. The app role *cannot* read tenant data without setting `app.user_id`
 *     (fail-closed: query errors instead of silently returning nothing).
 *  2. With the GUC set to user A, queries return only user A's rows.
 *  3. With the GUC set to user B, user A's rows are invisible.
 *
 * Run after `pnpm db:migrate`. Exits non-zero on any violation.
 */
import { sql } from "drizzle-orm";
import { makeDb, V1_USER_ID, withUser } from "../src/index.ts";
import { runs, users } from "../src/schema/index.ts";

const appUrl = process.env["DATABASE_URL"];
const adminUrl = process.env["DATABASE_URL_ADMIN"];
if (!appUrl || !adminUrl) {
  console.error("DATABASE_URL and DATABASE_URL_ADMIN required.");
  process.exit(1);
}

const USER_B = "00000000-0000-0000-0000-0000000000b2";

const admin = makeDb(adminUrl);
const app = makeDb(appUrl);

let failures = 0;
const check = (label: string, passed: boolean) => {
  console.log(`${passed ? "✓" : "✗"} ${label}`);
  if (!passed) failures += 1;
};

try {
  // --- Setup as superuser (bypasses RLS) ---
  await admin.db.insert(users).values({ id: USER_B, email: "userb@example.com", displayName: "User B" }).onConflictDoNothing();
  await admin.db.insert(runs).values([
    { userId: V1_USER_ID, kind: "test", status: "pending" },
    { userId: USER_B, kind: "test", status: "pending" },
  ]);

  // --- 1. No GUC set → must error ---
  try {
    await app.db.select().from(runs);
    check("app role reads with no app.user_id GUC -> error", false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    check("app role reads with no app.user_id GUC -> error", msg.includes("app.user_id") || msg.includes("unrecognized configuration"));
  }

  // --- 2. GUC = V1 → only V1's rows ---
  const v1Rows = await withUser(app.db, V1_USER_ID, async (tx) => tx.select().from(runs));
  check(`withUser(V1) returns only V1 rows (got ${v1Rows.length})`, v1Rows.length > 0 && v1Rows.every((r) => r.userId === V1_USER_ID));

  // --- 3. GUC = USER_B → only B's rows; V1 invisible ---
  const bRows = await withUser(app.db, USER_B, async (tx) => tx.select().from(runs));
  check(`withUser(B) returns only B rows (got ${bRows.length})`, bRows.length > 0 && bRows.every((r) => r.userId === USER_B));

  // --- 4. WITH CHECK: app role cannot insert a row for another user ---
  try {
    await withUser(app.db, V1_USER_ID, async (tx) => tx.insert(runs).values({ userId: USER_B, kind: "evil", status: "pending" }));
    check("app role cannot insert row for a different userId", false);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    check("app role cannot insert row for a different userId", msg.includes("row-level security") || msg.includes("policy"));
  }
} finally {
  // Cleanup so the test is rerunnable.
  await admin.db.execute(sql`delete from runs where kind = 'test' or kind = 'evil'`);
  await admin.db.execute(sql`delete from users where id = ${USER_B}`);
  await admin.close();
  await app.close();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll RLS checks passed.");
