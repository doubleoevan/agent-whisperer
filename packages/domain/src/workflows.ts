import type { UserId, WorkflowId } from "./ids.ts";

// canonical set of workflow types; values must match the exported workflow function names
export const WORKFLOW_TYPE = {
  hello: "helloWorkflow",
  outboxCoordinator: "outboxCoordinatorWorkflow",
  manuscriptIngest: "manuscriptIngestWorkflow",
  queryLetterGeneration: "queryLetterGenerationWorkflow",
  perAgentSubmission: "perAgentSubmissionWorkflow",
} as const;
export type WorkflowType = (typeof WORKFLOW_TYPE)[keyof typeof WORKFLOW_TYPE];

export type OutboxClaim = {
  id: string;
  userId: UserId;
  workflowType: WorkflowType;
  workflowId: WorkflowId;
  input: unknown;
};

export type OutboxActivities = {
  claimPendingOutboxBatch: (limit: number) => Promise<OutboxClaim[]>;
  startQueuedWorkflow: (row: OutboxClaim) => Promise<void>;
  markOutboxRowFailed: (rowId: string, errorMessage: string) => Promise<void>;
};
