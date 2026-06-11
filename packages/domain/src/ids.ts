// branded primitive ids; mixing one with another fails at compile time
export type UserId = string & { readonly __brand: "UserId" };
export type WorkflowId = string & { readonly __brand: "WorkflowId" };
export type ManuscriptId = string & { readonly __brand: "ManuscriptId" };
export type AgentId = string & { readonly __brand: "AgentId" };
export type SubmissionId = string & { readonly __brand: "SubmissionId" };

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

/**
 * Asserts a raw string is a ManuscriptId at the validation boundary.
 */
export function asManuscriptId(value: string): ManuscriptId {
  return value as ManuscriptId;
}

/**
 * Asserts a raw string is an AgentId at the validation boundary.
 */
export function asAgentId(value: string): AgentId {
  return value as AgentId;
}

/**
 * Asserts a raw string is a SubmissionId at the validation boundary.
 */
export function asSubmissionId(value: string): SubmissionId {
  return value as SubmissionId;
}
