import { proxyActivities } from "@temporalio/workflow";
import type { HelloActivities, HelloInput, HelloResult } from "@agent-whisperer/domain";

const { sayHello } = proxyActivities<HelloActivities>({
  startToCloseTimeout: "30 seconds",
});

/**
 * Greets the user via the sayHello activity.
 */
export async function helloWorkflow(input: HelloInput): Promise<HelloResult> {
  return sayHello(input);
}
