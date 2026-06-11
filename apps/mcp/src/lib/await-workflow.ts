import type { Client } from "@temporalio/client";
import type { WorkflowId } from "@agent-whisperer/domain";

const MAX_WAIT_FOR_START_MS = 10_000;
const POLL_INTERVAL_MS = 200;

/**
 * Polls until the outbox coordinator has started the workflow, then awaits and returns its final result.
 */
export async function awaitWorkflowResult<TResult>(client: Client, workflowId: WorkflowId): Promise<TResult> {
  // mcp can't import workflow code (would pull the workflow sdk into the mcp process); use untyped handle + cast
  const handle = client.workflow.getHandle(workflowId);
  const startedAt = Date.now();
  while (true) {
    try {
      await handle.describe();
      break;
    } catch {
      if (Date.now() - startedAt > MAX_WAIT_FOR_START_MS) {
        throw new Error(`coordinator did not start ${workflowId} within ${MAX_WAIT_FOR_START_MS}ms`);
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
  return (await handle.result()) as TResult;
}
