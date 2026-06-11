import { z } from "zod";
import { asWorkflowId, submissionEditSchema, SUBMISSION_EDIT_SIGNAL, type SubmissionEdit } from "@agent-whisperer/domain";
import type { Client } from "@temporalio/client";

export const editSubmissionInputSchema = {
  workflowId: z.string().min(1).describe("Submission workflow id returned by start_submission"),
  edit: submissionEditSchema.describe("Letter-field edit or submission-field edit; see SubmissionEdit shape"),
};

export type EditSubmissionInput = {
  workflowId: string;
  edit: SubmissionEdit;
};

/**
 * Sends an `edit` signal to a running submission workflow; the workflow applies it, persists, and updates its in-memory payload.
 */
export async function editSubmission(temporalClient: Client, input: EditSubmissionInput): Promise<void> {
  const handle = temporalClient.workflow.getHandle(asWorkflowId(input.workflowId));
  await handle.signal(SUBMISSION_EDIT_SIGNAL, input.edit);
}
