import { z } from "zod";
import { enqueueWorkflow, V1_USER_ID, withUser, type Database } from "@agent-whisperer/database";
import { type IngestManuscriptResult, type ManuscriptSource, WORKFLOW_TYPE } from "@agent-whisperer/domain";
import type { Client } from "@temporalio/client";
import { awaitWorkflowResult } from "../lib/await-workflow.ts";

// exactly one of driveFileId / localPath must be set; validated in the handler below
export const ingestManuscriptInputSchema = {
  driveFileId: z.string().min(1).optional().describe("Google Drive file id of a Google Doc the v1 user owns/has access to via Composio"),
  localPath: z.string().min(1).optional().describe("Absolute path to a local .docx file on the worker's filesystem"),
  idempotencyKey: z.string().optional().describe("Optional dedupe key; same key returns the same workflow id"),
};

export type IngestManuscriptToolInput = {
  driveFileId?: string;
  localPath?: string;
  idempotencyKey?: string;
};

/**
 * Enqueues a manuscript ingest workflow (drive export or local read) and waits for the workflow output.
 */
export async function ingestManuscript(dependencies: { database: Database; temporalClient: Client }, input: IngestManuscriptToolInput): Promise<IngestManuscriptResult> {
  // reject ambiguous input early so the workflow doesn't have to
  if (input.driveFileId !== undefined && input.localPath !== undefined) {
    throw new Error("ingest_manuscript: pass driveFileId OR localPath, not both");
  }
  if (input.driveFileId === undefined && input.localPath === undefined) {
    throw new Error("ingest_manuscript: must pass driveFileId or localPath");
  }
  const source: ManuscriptSource = input.driveFileId !== undefined
    ? { kind: "drive", driveFileId: input.driveFileId }
    : { kind: "local", localPath: input.localPath! };
  // same source → same workflow id by default, so re-runs are no-ops
  const defaultIdempotencyKey = source.kind === "drive" ? `drive:${source.driveFileId}` : `local:${source.localPath}`;
  const { workflowId } = await withUser(dependencies.database, V1_USER_ID, async (transaction) =>
    enqueueWorkflow(transaction, {
      userId: V1_USER_ID,
      workflowType: WORKFLOW_TYPE.manuscriptIngest,
      input: { userId: V1_USER_ID, source },
      idempotencyKey: input.idempotencyKey ?? defaultIdempotencyKey,
    }),
  );
  return awaitWorkflowResult<IngestManuscriptResult>(dependencies.temporalClient, workflowId);
}
