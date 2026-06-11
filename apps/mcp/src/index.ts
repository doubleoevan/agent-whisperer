import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client, Connection } from "@temporalio/client";
import { loadConfig } from "@agent-whisperer/config";
import { makeDatabase } from "@agent-whisperer/database";
import { editSubmission, editSubmissionInputSchema } from "./tools/edit-submission.ts";
import { enqueueHello, enqueueHelloInputSchema } from "./tools/enqueue-hello.ts";
import { finalizeSubmission, finalizeSubmissionInputSchema } from "./tools/finalize-submission.ts";
import { generateQueryLetterTool, generateQueryLetterInputSchema } from "./tools/generate-query-letter.ts";
import { getSubmission, getSubmissionInputSchema } from "./tools/get-submission.ts";
import { ingestManuscript, ingestManuscriptInputSchema } from "./tools/ingest-manuscript.ts";
import { listAgents, listAgentsInputSchema } from "./tools/list-agents.ts";
import { seedAgent, seedAgentInputSchema } from "./tools/seed-agent.ts";
import { startSubmission, startSubmissionInputSchema } from "./tools/start-submission.ts";
import { upsertFieldLibrary, upsertFieldLibraryInputSchema } from "./tools/upsert-field-library.ts";

// stdout is the MCP transport; all logs must go to stderr
const log = (message: string) => process.stderr.write(`[mcp] ${message}\n`);

const config = loadConfig();
const { database, close: closeDatabase } = makeDatabase(config.DATABASE_URL);
// temporal client used by tools that signal/query/await running workflows (signals + queries bypass the outbox)
const temporalConnection = await Connection.connect({ address: config.TEMPORAL_ADDRESS });
const temporalClient = new Client({ connection: temporalConnection, namespace: config.TEMPORAL_NAMESPACE });

const server = new McpServer({
  name: "agent-whisperer",
  version: "0.0.0",
});

// hello — original v1 smoke tool
server.registerTool(
  "enqueue_hello",
  { description: "Enqueue a hello workflow for the v1 user; returns the assigned workflow id.", inputSchema: enqueueHelloInputSchema },
  async (input) => {
    const { workflowId } = await enqueueHello(database, input);
    return { content: [{ type: "text", text: `enqueued workflowId: ${workflowId}` }] };
  },
);

// deliverable 1 — manuscript ingest
server.registerTool(
  "ingest_manuscript",
  { description: "Imports a Google Doc manuscript via Composio + mammoth; returns { manuscriptId, title, characterCount }.", inputSchema: ingestManuscriptInputSchema },
  async (input) => {
    const manuscript = await ingestManuscript({ database, temporalClient }, input);
    return { content: [{ type: "text", text: JSON.stringify(manuscript, null, 2) }] };
  },
);

// deliverable 2 — query letter (also exposes agent seed/list since the tool takes an agentId)
server.registerTool(
  "seed_agent",
  { description: "Inserts a single literary-agent row scoped to the v1 user; returns { agentId }.", inputSchema: seedAgentInputSchema },
  async (input) => {
    const seeded = await seedAgent(database, input);
    return { content: [{ type: "text", text: JSON.stringify(seeded, null, 2) }] };
  },
);

server.registerTool(
  "list_agents",
  { description: "Lists every literary agent the v1 user has seeded.", inputSchema: listAgentsInputSchema },
  async () => {
    const rows = await listAgents(database);
    return { content: [{ type: "text", text: JSON.stringify(rows, null, 2) }] };
  },
);

server.registerTool(
  "generate_query_letter",
  { description: "Generates a structured query letter for a (manuscriptId, agentId) pair; returns the validated QueryLetter object.", inputSchema: generateQueryLetterInputSchema },
  async (input) => {
    const letter = await generateQueryLetterTool({ database, temporalClient }, input);
    return { content: [{ type: "text", text: JSON.stringify(letter, null, 2) }] };
  },
);

// deliverable 3 — per-agent submission workflow + supporting field-library tool
server.registerTool(
  "upsert_field_library",
  { description: "Saves a (key, value) entry the composer will prefill when an agent's intake asks for that key.", inputSchema: upsertFieldLibraryInputSchema },
  async (input) => {
    const upserted = await upsertFieldLibrary(database, input);
    return { content: [{ type: "text", text: JSON.stringify(upserted, null, 2) }] };
  },
);

server.registerTool(
  "start_submission",
  { description: "Starts a long-running per-agent submission workflow; returns { workflowId } to use with edit/get/finalize.", inputSchema: startSubmissionInputSchema },
  async (input) => {
    const started = await startSubmission(database, input);
    return { content: [{ type: "text", text: JSON.stringify(started, null, 2) }] };
  },
);

server.registerTool(
  "get_submission",
  { description: "Reads the live submission payload from a running workflow via Temporal query.", inputSchema: getSubmissionInputSchema },
  async (input) => {
    const payload = await getSubmission(temporalClient, input);
    return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
  },
);

server.registerTool(
  "edit_submission",
  { description: "Sends an edit signal to a running submission workflow (letter field or submission field).", inputSchema: editSubmissionInputSchema },
  async (input) => {
    await editSubmission(temporalClient, input);
    return { content: [{ type: "text", text: "edit signal sent" }] };
  },
);

server.registerTool(
  "finalize_submission",
  { description: "Sends a finalize signal to a running submission workflow and returns the final payload.", inputSchema: finalizeSubmissionInputSchema },
  async (input) => {
    const finalized = await finalizeSubmission(temporalClient, input);
    return { content: [{ type: "text", text: JSON.stringify(finalized, null, 2) }] };
  },
);

const shutdown = async () => {
  log("shutting down");
  await server.close();
  await temporalConnection.close();
  await closeDatabase();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await server.connect(new StdioServerTransport());
log("ready; tools=enqueue_hello, ingest_manuscript, seed_agent, list_agents, generate_query_letter, upsert_field_library, start_submission, get_submission, edit_submission, finalize_submission");
