import { z } from "zod";
import { asWorkflowId, SUBMISSION_GET_CURRENT_PAYLOAD_QUERY, type SubmissionPayload } from "@agent-whisperer/domain";
import type { Client } from "@temporalio/client";

export const getSubmissionInputSchema = {
  workflowId: z.string().min(1).describe("Submission workflow id returned by start_submission"),
};

export type GetSubmissionInput = {
  workflowId: string;
};

/**
 * Reads the live submission payload from the running workflow via a Temporal query.
 */
export async function getSubmission(temporalClient: Client, input: GetSubmissionInput): Promise<SubmissionPayload> {
  const handle = temporalClient.workflow.getHandle(asWorkflowId(input.workflowId));
  return handle.query<SubmissionPayload>(SUBMISSION_GET_CURRENT_PAYLOAD_QUERY);
}
