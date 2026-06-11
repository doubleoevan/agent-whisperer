import { z } from "zod";
import { asWorkflowId, SUBMISSION_FINALIZE_SIGNAL, type PerAgentSubmissionResult } from "@agent-whisperer/domain";
import type { Client } from "@temporalio/client";

export const finalizeSubmissionInputSchema = {
  workflowId: z.string().min(1).describe("Submission workflow id returned by start_submission"),
};

export type FinalizeSubmissionInput = {
  workflowId: string;
};

/**
 * Sends a `finalize` signal to a running submission workflow and waits for the final payload back.
 */
export async function finalizeSubmission(temporalClient: Client, input: FinalizeSubmissionInput): Promise<PerAgentSubmissionResult> {
  const handle = temporalClient.workflow.getHandle(asWorkflowId(input.workflowId));
  await handle.signal(SUBMISSION_FINALIZE_SIGNAL);
  return (await handle.result()) as PerAgentSubmissionResult;
}
