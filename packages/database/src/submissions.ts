import type { AgentId, ManuscriptId, SubmissionId, SubmissionPayload, UserId, WorkflowId } from "@agent-whisperer/domain";
import { and, eq } from "drizzle-orm";
import type { Database, Transaction } from "./client.ts";
import { submissions, type SubmissionRow } from "./schema/submissions.ts";

/**
 * Inserts (or upserts on workflow id) a submission draft from inside an activity.
 */
export async function upsertSubmissionDraft(database: Database, input: {
  userId: UserId;
  manuscriptId: ManuscriptId;
  agentId: AgentId;
  workflowId: WorkflowId;
  payload: SubmissionPayload;
}): Promise<{ submissionId: SubmissionId }> {
  const [row] = await database
    .insert(submissions)
    .values({
      userId: input.userId,
      manuscriptId: input.manuscriptId,
      agentId: input.agentId,
      workflowId: input.workflowId,
      payload: input.payload,
      status: "drafting",
    })
    .onConflictDoUpdate({
      target: submissions.workflowId,
      set: { payload: input.payload, updatedAt: new Date() },
    })
    .returning({ id: submissions.id });
  if (!row) {
    throw new Error("upsertSubmissionDraft returned no row");
  }
  return { submissionId: row.id };
}

/**
 * Updates an in-flight draft's payload from inside an activity (after a signal-driven edit).
 */
export async function updateSubmissionPayload(database: Database, input: {
  userId: UserId;
  submissionId: SubmissionId;
  payload: SubmissionPayload;
}): Promise<void> {
  await database
    .update(submissions)
    .set({ payload: input.payload, updatedAt: new Date() })
    .where(and(eq(submissions.userId, input.userId), eq(submissions.id, input.submissionId)));
}

/**
 * Marks a draft finalized + writes the final payload from inside an activity.
 */
export async function markSubmissionFinalized(database: Database, input: {
  userId: UserId;
  submissionId: SubmissionId;
  payload: SubmissionPayload;
}): Promise<void> {
  const now = new Date();
  await database
    .update(submissions)
    .set({ status: "finalized", payload: input.payload, finalizedAt: now, updatedAt: now })
    .where(and(eq(submissions.userId, input.userId), eq(submissions.id, input.submissionId)));
}

/**
 * Reads the submission row associated with a workflow id, under the current user transaction.
 */
export async function getSubmissionByWorkflowId(transaction: Transaction, workflowId: WorkflowId): Promise<SubmissionRow | null> {
  const rows = await transaction
    .select()
    .from(submissions)
    .where(eq(submissions.workflowId, workflowId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Same lookup as getSubmissionByWorkflowId, but takes the admin connection so callers without a withUser scope can poll for the draft.
 */
export async function getSubmissionByWorkflowIdAdmin(database: Database, workflowId: WorkflowId): Promise<SubmissionRow | null> {
  const rows = await database
    .select()
    .from(submissions)
    .where(eq(submissions.workflowId, workflowId))
    .limit(1);
  return rows[0] ?? null;
}
