import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// spawn the server the same way opencode will; cwd is the workspace root so pnpm resolves binaries
const workspaceRoot = new URL("../../..", import.meta.url).pathname;
const transport = new StdioClientTransport({
  command: "pnpm",
  args: ["--filter", "@agent-whisperer/mcp", "dev"],
  cwd: workspaceRoot,
});

const client = new Client({ name: "agent-whisperer-smoke", version: "0.0.0" });

await client.connect(transport);

const tools = await client.listTools();
console.log("✓ tools/list ->", tools.tools.map((tool) => tool.name).join(", "));
console.log("  description:", tools.tools[0]?.description);
console.log("  inputSchema:", JSON.stringify(tools.tools[0]?.inputSchema));

const result = await client.callTool({
  name: "enqueue_hello",
  arguments: { name: "Evan" },
});

const content = result.content as Array<{ type: string; text?: string }> | undefined;
const text = content?.[0]?.type === "text" ? content[0].text : "<no text>";
console.log("✓ tools/call enqueue_hello ->", text);

await client.close();
