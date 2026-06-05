import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "@agent-whisperer/config";
import { makeDb } from "@agent-whisperer/db";
import { enqueueHello, enqueueHelloInputSchema } from "./tools/enqueue-hello.ts";

// stdout is the MCP transport; all logs must go to stderr
const log = (message: string) => process.stderr.write(`[mcp] ${message}\n`);

const config = loadConfig();
const { db, close: closeDb } = makeDb(config.DATABASE_URL);

const server = new McpServer({
  name: "agent-whisperer",
  version: "0.0.0",
});

server.registerTool(
  "enqueue_hello",
  {
    description: "Enqueue a hello workflow for the v1 user; returns the assigned workflow id.",
    inputSchema: enqueueHelloInputSchema,
  },
  async (input) => {
    const { workflowId } = await enqueueHello(db, input);
    return {
      content: [{ type: "text", text: `enqueued workflowId: ${workflowId}` }],
    };
  },
);

const shutdown = async () => {
  log("shutting down");
  await server.close();
  await closeDb();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

await server.connect(new StdioServerTransport());
log("ready; tool=enqueue_hello");
