import type { HelloActivities } from "@agent-whisperer/domain";

/**
 * Builds a greeting for the given user.
 */
export const sayHello: HelloActivities["sayHello"] = (input) =>
  Promise.resolve({
    greeting: `Hello, ${input.name}! (user=${input.userId})`,
    greetedAt: new Date().toISOString(),
  });
