import type { HelloInput, HelloResult } from "@agent-whisperer/domain";

/**
 * Activities are where side effects live. Free to import from db/ai/etc —
 * activities run in the regular Node context, not the workflow sandbox.
 * Hello-world doesn't need side effects yet; that's the point of the
 * placeholder.
 */
export async function sayHello(input: HelloInput): Promise<HelloResult> {
  return {
    greeting: `Hello, ${input.name}! (user=${input.userId})`,
    greetedAt: new Date().toISOString(),
  };
}
