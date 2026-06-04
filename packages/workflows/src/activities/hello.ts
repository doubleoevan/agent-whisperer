import type { HelloActivities } from "@agent-whisperer/domain";

/**
 * Builds a greeting for the given user.
 */
export const sayHello: HelloActivities["sayHello"] = async (input) => {
  return {
    greeting: `Hello, ${input.name}! (user=${input.userId})`,
    greetedAt: new Date().toISOString(),
  };
};
