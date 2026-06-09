import { Client, Connection } from "@temporalio/client";
import { loadConfig } from "@agent-whisperer/config";
import { enqueueWorkflow, makeDatabase, V1_USER_ID, withUser } from "@agent-whisperer/database";
import { WORKFLOW_TYPE } from "@agent-whisperer/domain";
import type { helloWorkflow } from "@agent-whisperer/workflows/workflows";

const config = loadConfig();

// enqueue runs as the app role; row-level security enforces userId on insert
const { database, close } = makeDatabase(config.DATABASE_URL);

const { workflowId } = await withUser(database, V1_USER_ID, async (transaction) =>
  enqueueWorkflow(transaction, {
    userId: V1_USER_ID,
    workflowType: WORKFLOW_TYPE.hello,
    input: { userId: V1_USER_ID, name: "Evan" },
  }),
);

console.log(`[enqueue] inserted outbox row -> workflow ${workflowId}; waiting for coordinator to start it...`);

// observe the workflow as a separate concern; the coordinator started it
const connection = await Connection.connect({ address: config.TEMPORAL_ADDRESS });
const client = new Client({ connection, namespace: config.TEMPORAL_NAMESPACE });
const handle = client.workflow.getHandle<typeof helloWorkflow>(workflowId);

// poll until the coordinator has started the workflow, then await its result
const startedAt = Date.now();
while (true) {
  try {
    await handle.describe();
    break;
  } catch {
    if (Date.now() - startedAt > 10_000) {
      throw new Error(`coordinator did not start ${workflowId} within 10s`);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

const result = await handle.result();
console.log("[enqueue] result:", result);

await connection.close();
await close();
