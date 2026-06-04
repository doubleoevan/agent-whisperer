/**
 * Smoke test: kick off `helloWorkflow` against the local Temporal server
 * and await the result. Until the outbox lands in Step 6, this is how we
 * exercise the worker; after Step 6 every kick-off goes via the outbox row.
 */
import { Client, Connection } from "@temporalio/client";
import { loadConfig } from "@agent-whisperer/config";
import { V1_USER_ID } from "@agent-whisperer/db";
import type { helloWorkflow } from "@agent-whisperer/workflows/workflows";

const cfg = loadConfig();

const connection = await Connection.connect({ address: cfg.TEMPORAL_ADDRESS });
const client = new Client({ connection, namespace: cfg.TEMPORAL_NAMESPACE });

const handle = await client.workflow.start<typeof helloWorkflow>("helloWorkflow", {
  args: [{ userId: V1_USER_ID, name: "Evan" }],
  taskQueue: "default",
  workflowId: `hello-${Date.now()}`,
});

console.log(`[trigger] started workflow ${handle.workflowId}; awaiting result...`);
const result = await handle.result();
console.log("[trigger] result:", result);

await connection.close();
