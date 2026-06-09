import { asUserId, type WorkflowType } from "@agent-whisperer/domain";
import { eq, inArray, or } from "drizzle-orm";
import { enqueueWorkflow, makeDatabase, V1_USER_ID, withUser } from "../src/index.ts";
import { outbox, runs, users } from "../src/schema/index.ts";

const appUrl = process.env["DATABASE_URL"];
const adminUrl = process.env["DATABASE_URL_ADMIN"];
if (!appUrl || !adminUrl) {
  console.error("DATABASE_URL and DATABASE_URL_ADMIN required.");
  process.exit(1);
}

const USER_B = asUserId("00000000-0000-0000-0000-0000000000b2");

// sentinel workflow types used only by this row-level-security test; not real workflow names
const NOOP_WORKFLOW_TYPE = "noop" as WorkflowType;
const EVIL_WORKFLOW_TYPE = "evil" as WorkflowType;

const admin = makeDatabase(adminUrl);
const app = makeDatabase(appUrl);

let failures = 0;
const check = (label: string, isPassed: boolean) => {
  console.log(`${isPassed ? "✓" : "✗"} ${label}`);
  if (!isPassed) {
    failures += 1;
  }
};

try {
  // seed user B and both users' runs as superuser (bypasses row-level security)
  await admin.database.insert(users).values({ id: USER_B, email: "userb@example.com", displayName: "User B" }).onConflictDoNothing();
  await admin.database.insert(runs).values([
    { userId: V1_USER_ID, kind: "test", status: "pending" },
    { userId: USER_B, kind: "test", status: "pending" },
  ]);

  // runs: app role with no session setting must fail closed
  try {
    await app.database.select().from(runs);
    check("runs: no session setting -> error", false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check("runs: no session setting -> error", message.includes("app.user_id") || message.includes("unrecognized configuration"));
  }

  // runs: session setting = V1 returns only V1's rows
  const v1UserRows = await withUser(app.database, V1_USER_ID, async (transaction) => transaction.select().from(runs));
  check(`runs: withUser(V1) returns only V1 rows (got ${v1UserRows.length})`, v1UserRows.length > 0 && v1UserRows.every((row) => row.userId === V1_USER_ID));

  // runs: session setting = USER_B returns only B's rows; V1 invisible
  const userBRows = await withUser(app.database, USER_B, async (transaction) => transaction.select().from(runs));
  check(`runs: withUser(B) returns only B rows (got ${userBRows.length})`, userBRows.length > 0 && userBRows.every((row) => row.userId === USER_B));

  // runs: WITH CHECK blocks inserting a row for a different userId
  try {
    await withUser(app.database, V1_USER_ID, async (transaction) => transaction.insert(runs).values({ userId: USER_B, kind: "evil", status: "pending" }));
    check("runs: app role cannot insert row for a different userId", false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check("runs: app role cannot insert row for a different userId", message.includes("row-level security") || message.includes("policy"));
  }

  // outbox: enqueueWorkflow inside withUser succeeds for own userId
  const { workflowId: v1WorkflowId } = await withUser(app.database, V1_USER_ID, async (transaction) =>
    enqueueWorkflow(transaction, { userId: V1_USER_ID, workflowType: NOOP_WORKFLOW_TYPE, input: {} }),
  );
  const v1OutboxRows = await withUser(app.database, V1_USER_ID, async (transaction) => transaction.select().from(outbox).where(eq(outbox.workflowId, v1WorkflowId)));
  check("outbox: enqueueWorkflow visible to its own user", v1OutboxRows.length === 1);

  // outbox: WITH CHECK blocks enqueuing for another userId
  try {
    await withUser(app.database, V1_USER_ID, async (transaction) =>
      enqueueWorkflow(transaction, { userId: USER_B, workflowType: EVIL_WORKFLOW_TYPE, input: {} }),
    );
    check("outbox: app role cannot enqueue for a different userId", false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check("outbox: app role cannot enqueue for a different userId", message.includes("row-level security") || message.includes("policy"));
  }

  // outbox: tenant B does not see V1's enqueued row
  const userBOutboxRows = await withUser(app.database, USER_B, async (transaction) => transaction.select().from(outbox).where(eq(outbox.workflowId, v1WorkflowId)));
  check("outbox: cross-tenant read returns no rows", userBOutboxRows.length === 0);
} finally {
  // cleanup so the test is rerunnable
  await admin.database.delete(runs).where(inArray(runs.kind, ["test", "evil"]));
  await admin.database.delete(outbox).where(or(eq(outbox.workflowType, "noop"), eq(outbox.workflowType, "evil")));
  await admin.database.delete(users).where(eq(users.id, USER_B));
  await admin.close();
  await app.close();
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nAll tenant-isolation checks passed.");
