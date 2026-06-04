// pure types; the only package workflows/ is allowed to import

// branded primitive ids; mixing one with another fails at compile time
export type UserId = string & { readonly __brand: "UserId" };
export type WorkflowId = string & { readonly __brand: "WorkflowId" };

/**
 * Asserts a raw string is a UserId at the validation boundary.
 */
export function asUserId(value: string): UserId {
  return value as UserId;
}

/**
 * Asserts a raw string is a WorkflowId at the validation boundary.
 */
export function asWorkflowId(value: string): WorkflowId {
  return value as WorkflowId;
}

export type HelloInput = {
  userId: UserId;
  name: string;
};

export type HelloResult = {
  greeting: string;
  greetedAt: string;
};

// activity contracts — workflows depend on these; activities implement them
export type HelloActivities = {
  sayHello: (input: HelloInput) => Promise<HelloResult>;
};

export type OutboxClaim = {
  id: string;
  userId: UserId;
  workflowType: string;
  workflowId: WorkflowId;
  input: unknown;
};

export type OutboxActivities = {
  claimPendingOutboxBatch: (limit: number) => Promise<OutboxClaim[]>;
  startQueuedWorkflow: (row: OutboxClaim) => Promise<void>;
  markOutboxRowFailed: (rowId: string, errorMessage: string) => Promise<void>;
};
