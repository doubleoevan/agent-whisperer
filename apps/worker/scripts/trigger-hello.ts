import { Client, Connection } from "@temporalio/client";
import { loadConfig } from "@agent-whisperer/config";
import { V1_USER_ID } from "@agent-whisperer/db";
import type { helloWorkflow } from "@agent-whisperer/workflows/workflows";

const config = loadConfig();

const connection = await Connection.connect({ address: config.TEMPORAL_ADDRESS });
const client = new Client({ connection, namespace: config.TEMPORAL_NAMESPACE });

// kick off helloWorkflow; replaced by outbox-driven starts in Step 6
const handle = await client.workflow.start<typeof helloWorkflow>("helloWorkflow", {
  args: [{ userId: V1_USER_ID, name: "Evan" }],
  taskQueue: "default",
  workflowId: `hello-${Date.now()}`,
});

console.log(`[trigger] started workflow ${handle.workflowId}; awaiting result...`);
const result = await handle.result();
console.log("[trigger] result:", result);

await connection.close();
