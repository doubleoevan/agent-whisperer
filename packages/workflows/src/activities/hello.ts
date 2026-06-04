import type { HelloInput, HelloResult } from "@agent-whisperer/domain";

/**
 * Builds a greeting for the given user.
 */
export async function sayHello(input: HelloInput): Promise<HelloResult> {
  return {
    greeting: `Hello, ${input.name}! (user=${input.userId})`,
    greetedAt: new Date().toISOString(),
  };
}
