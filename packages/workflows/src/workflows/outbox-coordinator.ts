import { continueAsNew, log, proxyActivities, sleep } from "@temporalio/workflow";
import type { OutboxActivities } from "@agent-whisperer/domain";

const { claimPendingOutboxBatch, startQueuedWorkflow, markOutboxRowFailed } = proxyActivities<OutboxActivities>({
  startToCloseTimeout: "1 minute",
});

const BATCH_SIZE = 25;
const POLL_INTERVAL_MS = 1000;
const ITERATIONS_BEFORE_CONTINUE_AS_NEW = 1000;

/**
 * Eternal workflow; polls the outbox, starts queued workflows idempotently, continues-as-new to bound history.
 */
export async function outboxCoordinatorWorkflow(): Promise<void> {
  for (let iteration = 0; iteration < ITERATIONS_BEFORE_CONTINUE_AS_NEW; iteration += 1) {
    const claimedRows = await claimPendingOutboxBatch(BATCH_SIZE);

    for (const row of claimedRows) {
      try {
        await startQueuedWorkflow(row);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.warn("outbox row failed to start", { rowId: row.id, message });
        await markOutboxRowFailed(row.id, message);
      }
    }

    // idle if the batch was empty; saturate when there's work
    if (claimedRows.length === 0) {
      await sleep(POLL_INTERVAL_MS);
    }
  }

  await continueAsNew<typeof outboxCoordinatorWorkflow>();
}
