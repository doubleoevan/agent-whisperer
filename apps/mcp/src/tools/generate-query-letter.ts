import { z } from "zod";
import { enqueueWorkflow, V1_USER_ID, withUser, type Database } from "@agent-whisperer/database";
import {
  asAgentId,
  asManuscriptId,
  type QueryLetter,
  WORKFLOW_TYPE,
} from "@agent-whisperer/domain";
import type { Client } from "@temporalio/client";
import { awaitWorkflowResult } from "../lib/await-workflow.ts";

export const generateQueryLetterInputSchema = {
  manuscriptId: z.string().uuid().describe("Manuscript id returned by ingest_manuscript"),
  agentId: z.string().uuid().describe("Literary agent id (from list_agents)"),
  voiceSamples: z.string().optional().describe("Optional author voice snippets the letter can draw from"),
  preferences: z.string().optional().describe("Optional learned style preferences; ignored in v1"),
  idempotencyKey: z.string().optional().describe("Optional dedupe key; same key returns the same workflow id"),
};

export type GenerateQueryLetterInput = {
  manuscriptId: string;
  agentId: string;
  voiceSamples?: string;
  preferences?: string;
  idempotencyKey?: string;
};

/**
 * Enqueues a query-letter generation workflow and waits for the structured letter back.
 */
export async function generateQueryLetterTool(dependencies: { database: Database; temporalClient: Client }, input: GenerateQueryLetterInput): Promise<QueryLetter> {
  const manuscriptId = asManuscriptId(input.manuscriptId);
  const agentId = asAgentId(input.agentId);
  const { workflowId } = await withUser(dependencies.database, V1_USER_ID, async (transaction) =>
    enqueueWorkflow(transaction, {
      userId: V1_USER_ID,
      workflowType: WORKFLOW_TYPE.queryLetterGeneration,
      input: {
        userId: V1_USER_ID,
        manuscriptId,
        agentId,
        voiceSamples: input.voiceSamples,
        preferences: input.preferences,
      },
      idempotencyKey: input.idempotencyKey,
    }),
  );
  return awaitWorkflowResult<QueryLetter>(dependencies.temporalClient, workflowId);
}
