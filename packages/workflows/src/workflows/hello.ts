import { proxyActivities } from "@temporalio/workflow";
import type { HelloInput, HelloResult } from "@agent-whisperer/domain";
import type * as activities from "../activities/index.ts";

// proxyActivities dispatches to the real activity from inside the workflow sandbox
const { sayHello } = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
});

/**
 * Greets the user via the sayHello activity.
 */
export async function helloWorkflow(input: HelloInput): Promise<HelloResult> {
  return sayHello(input);
}
