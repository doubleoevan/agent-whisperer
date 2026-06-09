import { z } from "zod";
import { enqueueWorkflow, V1_USER_ID, withUser, type Database } from "@agent-whisperer/database";
import { WORKFLOW_TYPE } from "@agent-whisperer/domain";

export const enqueueHelloInputSchema = {
  name: z.string().min(1).describe("Name to greet"),
  idempotencyKey: z.string().optional().describe("Optional dedupe key; same key returns the same workflow id"),
};

export type EnqueueHelloInput = {
  name: string;
  idempotencyKey?: string;
};

/**
 * Inserts an outbox row that the coordinator will start as a helloWorkflow.
 */
export async function enqueueHello(database: Database, input: EnqueueHelloInput): Promise<{ workflowId: string }> {
  const { workflowId } = await withUser(database, V1_USER_ID, async (transaction) =>
    enqueueWorkflow(transaction, {
      userId: V1_USER_ID,
      workflowType: WORKFLOW_TYPE.hello,
      input: { userId: V1_USER_ID, name: input.name },
      idempotencyKey: input.idempotencyKey,
    }),
  );
  return { workflowId };
}
