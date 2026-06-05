import { z } from "zod";
import { enqueueWorkflow, V1_USER_ID, withUser, type Db } from "@agent-whisperer/db";

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
export async function enqueueHello(db: Db, input: EnqueueHelloInput): Promise<{ workflowId: string }> {
  const { workflowId } = await withUser(db, V1_USER_ID, async (tx) =>
    enqueueWorkflow(tx, {
      userId: V1_USER_ID,
      workflowType: "helloWorkflow",
      input: { userId: V1_USER_ID, name: input.name },
      idempotencyKey: input.idempotencyKey,
    }),
  );
  return { workflowId };
}
