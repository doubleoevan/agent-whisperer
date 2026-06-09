import { Client, Connection, WorkflowIdConflictPolicy } from "@temporalio/client";
import { NativeConnection, Worker } from "@temporalio/worker";
import { loadConfig } from "@agent-whisperer/config";
import { makeDatabase } from "@agent-whisperer/database";
import { WORKFLOW_TYPE } from "@agent-whisperer/domain";
import { sayHello, makeOutboxActivities } from "@agent-whisperer/workflows/activities";

const config = loadConfig();
if (!config.DATABASE_URL_ADMIN) {
  throw new Error("DATABASE_URL_ADMIN required for the outbox coordinator to bypass row-level security.");
}

const TASK_QUEUE = "agent-whisperer";
const COORDINATOR_WORKFLOW_ID = "outbox-coordinator";

// admin db connection for coordinator activities (must see all users' rows)
const { database: adminDatabase, close: closeDatabase } = makeDatabase(config.DATABASE_URL_ADMIN);

// worker uses NativeConnection (gRPC C++); client uses Connection (TS gRPC) for activity-side starts
const workerConnection = await NativeConnection.connect({ address: config.TEMPORAL_ADDRESS });
const clientConnection = await Connection.connect({ address: config.TEMPORAL_ADDRESS });
const temporalClient = new Client({ connection: clientConnection, namespace: config.TEMPORAL_NAMESPACE });

const outboxActivities = makeOutboxActivities({ adminDatabase, client: temporalClient, taskQueue: TASK_QUEUE });

const worker = await Worker.create({
  connection: workerConnection,
  namespace: config.TEMPORAL_NAMESPACE,
  taskQueue: TASK_QUEUE,
  workflowsPath: new URL("../../../packages/workflows/src/workflows/index.ts", import.meta.url).pathname,
  activities: { sayHello, ...outboxActivities },
});

// idempotent coordinator boot: fixed workflowId + USE_EXISTING means re-runs never duplicate
await temporalClient.workflow.start(WORKFLOW_TYPE.outboxCoordinator, {
  workflowId: COORDINATOR_WORKFLOW_ID,
  taskQueue: TASK_QUEUE,
  workflowIdConflictPolicy: WorkflowIdConflictPolicy.USE_EXISTING,
});
console.log(`[worker] ensured ${COORDINATOR_WORKFLOW_ID} is running`);

console.log(`[worker] connected to ${config.TEMPORAL_ADDRESS} (ns=${config.TEMPORAL_NAMESPACE}); polling '${TASK_QUEUE}' task queue`);

// SIGINT/SIGTERM trigger worker.shutdown(); run() resolves, finally closes connections
process.on("SIGINT", () => void worker.shutdown());
process.on("SIGTERM", () => void worker.shutdown());

try {
  await worker.run();
} finally {
  await workerConnection.close();
  await clientConnection.close();
  await closeDatabase();
}
