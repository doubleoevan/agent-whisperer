import { z } from "zod";
import { enqueueWorkflow, V1_USER_ID, withUser, type Database } from "@agent-whisperer/database";
import {
  asAgentId,
  asManuscriptId,
  WORKFLOW_TYPE,
  type WorkflowId,
} from "@agent-whisperer/domain";

export const startSubmissionInputSchema = {
  manuscriptId: z.string().uuid().describe("Manuscript id (from ingest_manuscript)"),
  agentId: z.string().uuid().describe("Literary agent id (from list_agents)"),
  preferences: z.string().optional().describe("Optional learned style preferences; ignored in v1"),
};

export type StartSubmissionInput = {
  manuscriptId: string;
  agentId: string;
  preferences?: string;
};

/**
 * Enqueues a long-running per-agent submission workflow and returns its workflow id immediately; later edit/finalize tools signal it.
 */
export async function startSubmission(database: Database, input: StartSubmissionInput): Promise<{ workflowId: WorkflowId }> {
  const manuscriptId = asManuscriptId(input.manuscriptId);
  const agentId = asAgentId(input.agentId);
  // one in-flight submission per (manuscript, agent) — workflow id is keyed off both so re-enqueue is a no-op
  const { workflowId } = await withUser(database, V1_USER_ID, async (transaction) =>
    enqueueWorkflow(transaction, {
      userId: V1_USER_ID,
      workflowType: WORKFLOW_TYPE.perAgentSubmission,
      input: { userId: V1_USER_ID, manuscriptId, agentId, preferences: input.preferences },
      idempotencyKey: `${manuscriptId}-${agentId}`,
    }),
  );
  return { workflowId };
}
