import type { OutboxActivities, OutboxClaim } from "@agent-whisperer/domain";
import { and, eq, sql } from "drizzle-orm";
import type { Client } from "@temporalio/client";
import { WorkflowIdConflictPolicy } from "@temporalio/common";
import type { Database } from "@agent-whisperer/database";
import { schema } from "@agent-whisperer/database";

export type OutboxActivityDeps = {
  adminDatabase: Database;
  client: Client;
  taskQueue: string;
};

/**
 * Builds outbox activities bound to a db connection and Temporal client.
 */
export function makeOutboxActivities({ adminDatabase, client, taskQueue }: OutboxActivityDeps): OutboxActivities {
  return {
    claimPendingOutboxBatch: async (limit) => {
      // FOR UPDATE SKIP LOCKED lets parallel coordinators take disjoint batches without blocking
      const rows = await adminDatabase.execute<OutboxClaim>(sql`
        with claimed as (
          select id from outbox
          where status = 'pending'
          order by created_at
          limit ${limit}
          for update skip locked
        )
        update outbox
        set status = 'claimed',
            last_attempt_at = now(),
            attempts = outbox.attempts + 1
        from claimed
        where outbox.id = claimed.id
        returning outbox.id, outbox.user_id as "userId", outbox.workflow_type as "workflowType", outbox.workflow_id as "workflowId", outbox.input
      `);
      return Array.from(rows);
    },

    startQueuedWorkflow: async (row) => {
      // USE_EXISTING makes the start a no-op if a prior coordinator pass already started it
      await client.workflow.start(row.workflowType, {
        workflowId: row.workflowId,
        taskQueue,
        args: [row.input],
        workflowIdConflictPolicy: WorkflowIdConflictPolicy.USE_EXISTING,
      });
      // workflow is running; bookkeeping failure must not poison the row (sweeper reconciles)
      try {
        await adminDatabase
          .update(schema.outbox)
          .set({ status: "processed", settledAt: new Date() })
          .where(eq(schema.outbox.id, row.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[outbox] started ${row.workflowId} but row update failed: ${message}`);
      }
    },

    markOutboxRowFailed: async (rowId, errorMessage) => {
      await adminDatabase
        .update(schema.outbox)
        .set({ status: "failed", lastError: errorMessage, settledAt: new Date() })
        .where(and(eq(schema.outbox.id, rowId), eq(schema.outbox.status, "claimed")));
    },
  };
}
