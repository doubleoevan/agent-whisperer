import { proxyActivities } from "@temporalio/workflow";
import type { HelloInput, HelloResult } from "@agent-whisperer/domain";
import type * as activities from "../activities/index.ts";

/**
 * Workflow code is DETERMINISTIC. Allowed imports: @agent-whisperer/domain,
 * Temporal's workflow SDK, and ambient type-only imports of activities (the
 * `import type` form leaves no runtime trace). Step 9's ESLint rule will
 * enforce this; for now it's discipline.
 *
 * `proxyActivities` returns a stub that, when invoked inside a workflow,
 * dispatches the call to a real activity executor — that's how Temporal
 * keeps the deterministic shell while letting side effects happen elsewhere.
 */
const { sayHello } = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
});

export async function helloWorkflow(input: HelloInput): Promise<HelloResult> {
  return sayHello(input);
}
