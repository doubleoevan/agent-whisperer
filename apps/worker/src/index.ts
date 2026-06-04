import { NativeConnection, Worker } from "@temporalio/worker";
import { loadConfig } from "@agent-whisperer/config";
import * as activities from "@agent-whisperer/workflows/activities";

/**
 * Temporal worker process. Node-only — Bun's missing native bits the worker
 * relies on (per CLAUDE.md).
 *
 * The worker is the boundary between the deterministic workflow sandbox and
 * the real world. It loads workflow code as a bundle (executed in a v8
 * isolate per workflow), and exposes activities as plain functions runnable
 * in the regular Node context.
 *
 * One task queue ("default") for v1 — split when worker fleets need to
 * scale independently.
 */
const cfg = loadConfig();

const connection = await NativeConnection.connect({ address: cfg.TEMPORAL_ADDRESS });

const worker = await Worker.create({
  connection,
  namespace: cfg.TEMPORAL_NAMESPACE,
  taskQueue: "default",
  workflowsPath: new URL("../../../packages/workflows/src/workflows/index.ts", import.meta.url).pathname,
  activities,
});

console.log(`[worker] connected to ${cfg.TEMPORAL_ADDRESS} (ns=${cfg.TEMPORAL_NAMESPACE}); polling 'default' task queue`);
await worker.run();
