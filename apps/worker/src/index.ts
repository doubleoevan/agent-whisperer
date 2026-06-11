import { Composio } from "@composio/core";
import { Client, Connection, WorkflowIdConflictPolicy } from "@temporalio/client";
import { NativeConnection, Worker } from "@temporalio/worker";
import { makeAi } from "@agent-whisperer/ai";
import { loadConfig } from "@agent-whisperer/config";
import { makeDatabase } from "@agent-whisperer/database";
import { WORKFLOW_TYPE } from "@agent-whisperer/domain";
import {
  makeLookupActivities,
  makeManuscriptIngestActivities,
  makeOutboxActivities,
  makeQueryLetterActivities,
  makeSubmissionActivities,
  sayHello,
} from "@agent-whisperer/workflows/activities";

const config = loadConfig();
if (!config.DATABASE_URL_ADMIN) {
  throw new Error("DATABASE_URL_ADMIN required for the outbox coordinator + activities to bypass row-level security.");
}

const TASK_QUEUE = "agent-whisperer";
const COORDINATOR_WORKFLOW_ID = "outbox-coordinator";
// v1 composio "user id" — opaque per-tenant key composio uses to scope connected-account lookups
const V1_COMPOSIO_USER_ID = "agent-whisperer-v1";

// admin db connection used by every activity that needs to read or write across tenants
const { database: adminDatabase, close: closeDatabase } = makeDatabase(config.DATABASE_URL_ADMIN);

// llm + composio clients live for the worker's lifetime
const { modelFor } = makeAi({ baseUrl: config.LITELLM_BASE_URL, apiKey: config.LITELLM_API_KEY });
// dangerouslyAllowAutoUploadDownloadFiles tells composio to download file-shaped outputs to disk; the manuscript activity then reads the local path
const composio = new Composio({
  apiKey: config.COMPOSIO_API_KEY,
  dangerouslyAllowAutoUploadDownloadFiles: true,
});

// resolve the google drive "Export Google Workspace file" action slug from composio's catalog so we never hardcode the slug
const googleExportActionSlug = await resolveGoogleExportSlug(composio);
console.log(`[worker] resolved google drive export action: ${googleExportActionSlug}`);

// worker uses NativeConnection (gRPC C++); client uses Connection (TS gRPC) for activity-side starts
const workerConnection = await NativeConnection.connect({ address: config.TEMPORAL_ADDRESS });
const clientConnection = await Connection.connect({ address: config.TEMPORAL_ADDRESS });
const temporalClient = new Client({ connection: clientConnection, namespace: config.TEMPORAL_NAMESPACE });

const outboxActivities = makeOutboxActivities({ adminDatabase, client: temporalClient, taskQueue: TASK_QUEUE });
const manuscriptIngestActivities = makeManuscriptIngestActivities({
  composio,
  adminDatabase,
  composioUserId: V1_COMPOSIO_USER_ID,
  googleExportActionSlug,
});
const lookupActivities = makeLookupActivities({ adminDatabase });
const queryLetterActivities = makeQueryLetterActivities({ modelFor });
const submissionActivities = makeSubmissionActivities({ modelFor, adminDatabase });

const worker = await Worker.create({
  connection: workerConnection,
  namespace: config.TEMPORAL_NAMESPACE,
  taskQueue: TASK_QUEUE,
  workflowsPath: new URL("../../../packages/workflows/src/workflows/index.ts", import.meta.url).pathname,
  activities: {
    sayHello,
    ...outboxActivities,
    ...manuscriptIngestActivities,
    ...lookupActivities,
    ...queryLetterActivities,
    ...submissionActivities,
  },
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

/**
 * Resolves the slug for google drive's "Export Google Workspace file" action by querying composio's catalog.
 */
async function resolveGoogleExportSlug(composioClient: Composio): Promise<string> {
  const candidates = await composioClient.tools.getRawComposioTools({
    toolkits: ["googledrive"],
    search: "Export Google Workspace file",
    limit: 10,
  });
  if (candidates.length === 0) {
    throw new Error(`composio has no googledrive tools matching "Export Google Workspace file"; check that the toolkit is connected for ${V1_COMPOSIO_USER_ID}.`);
  }
  // prefer a tool whose slug or description explicitly mentions exporting/workspace; fall back to the top match
  const preferred = candidates.find((tool) => /export/i.test(tool.slug) && /(workspace|google.?doc|gdoc)/i.test(`${tool.slug} ${tool.description ?? ""}`));
  return (preferred ?? candidates[0]!).slug;
}
