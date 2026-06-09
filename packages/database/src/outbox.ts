import { randomUUID } from "node:crypto";
import { asWorkflowId, type UserId, type WorkflowId, type WorkflowType } from "@agent-whisperer/domain";
import type { Transaction } from "./client.ts";
import { outbox } from "./schema/outbox.ts";

export type EnqueueWorkflowInput = {
  userId: UserId;
  workflowType: WorkflowType;
  input: unknown;
  idempotencyKey?: string;
};

export type EnqueueWorkflowResult = {
  outboxRowId: string;
  workflowId: WorkflowId;
};

/**
 * Inserts an outbox row. Call inside `withUser` so row-level security enforces userId.
 */
export async function enqueueWorkflow(transaction: Transaction, params: EnqueueWorkflowInput): Promise<EnqueueWorkflowResult> {
  // tenant id baked into the workflow id makes cross-tenant collisions impossible
  const key = params.idempotencyKey ?? randomUUID();
  const workflowId = asWorkflowId(`${params.workflowType}-${params.userId}-${key}`);
  const [row] = await transaction.insert(outbox).values({
    userId: params.userId,
    workflowType: params.workflowType,
    workflowId,
    input: params.input,
  }).returning({ id: outbox.id });
  if (!row) {
    throw new Error("enqueueWorkflow insert returned no row");
  }
  return { outboxRowId: row.id, workflowId };
}
