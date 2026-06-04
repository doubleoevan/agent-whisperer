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
const check = (label: string, isPassed: boolean) => {
  console.log(`${isPassed ? "✓" : "✗"} ${label}`);
  if (!isPassed) {
    failures += 1;
  }
};

try {
  // seed two users' rows as superuser (bypasses row-level security)
  await admin.db.insert(users).values({ id: USER_B, email: "userb@example.com", displayName: "User B" }).onConflictDoNothing();
  await admin.db.insert(runs).values([
    { userId: V1_USER_ID, kind: "test", status: "pending" },
    { userId: USER_B, kind: "test", status: "pending" },
  ]);

  // app role with no session setting must fail closed
  try {
    await app.db.select().from(runs);
    check("app role reads with no app.user_id session setting -> error", false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check("app role reads with no app.user_id session setting -> error", message.includes("app.user_id") || message.includes("unrecognized configuration"));
  }

  // session setting = V1 returns only V1's rows
  const v1UserRows = await withUser(app.db, V1_USER_ID, async (tx) => tx.select().from(runs));
  check(`withUser(V1) returns only V1 rows (got ${v1UserRows.length})`, v1UserRows.length > 0 && v1UserRows.every((row) => row.userId === V1_USER_ID));

  // session setting = USER_B returns only B's rows; V1 invisible
  const userBRows = await withUser(app.db, USER_B, async (tx) => tx.select().from(runs));
  check(`withUser(B) returns only B rows (got ${userBRows.length})`, userBRows.length > 0 && userBRows.every((row) => row.userId === USER_B));

  // WITH CHECK blocks inserting a row for a different userId
  try {
    await withUser(app.db, V1_USER_ID, async (tx) => tx.insert(runs).values({ userId: USER_B, kind: "evil", status: "pending" }));
    check("app role cannot insert row for a different userId", false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check("app role cannot insert row for a different userId", message.includes("row-level security") || message.includes("policy"));
  }
} finally {
  // cleanup so the test is rerunnable
  await admin.db.execute(sql`delete from runs where kind = 'test' or kind = 'evil'`);
  await admin.db.execute(sql`delete from users where id = ${USER_B}`);
  await admin.close();
  await app.close();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll tenant-isolation checks passed.");
