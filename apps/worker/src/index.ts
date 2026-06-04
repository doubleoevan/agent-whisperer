import { NativeConnection, Worker } from "@temporalio/worker";
import { loadConfig } from "@agent-whisperer/config";
import * as activities from "@agent-whisperer/workflows/activities";

const config = loadConfig();

// connect to the local Temporal server
const connection = await NativeConnection.connect({ address: config.TEMPORAL_ADDRESS });

// bundle workflows for the sandbox; activities run in regular Node context
const worker = await Worker.create({
  connection,
  namespace: config.TEMPORAL_NAMESPACE,
  taskQueue: "default",
  workflowsPath: new URL("../../../packages/workflows/src/workflows/index.ts", import.meta.url).pathname,
  activities,
});

console.log(`[worker] connected to ${config.TEMPORAL_ADDRESS} (ns=${config.TEMPORAL_NAMESPACE}); polling 'default' task queue`);
await worker.run();
