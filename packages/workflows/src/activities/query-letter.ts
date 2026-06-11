import { generateQueryLetter, type ModelFor } from "@agent-whisperer/ai";
import type { QueryLetterActivities } from "@agent-whisperer/domain";

export type QueryLetterActivityDeps = {
  modelFor: ModelFor;
};

/**
 * Builds the query-letter generation activity bound to a model factory.
 */
export function makeQueryLetterActivities({ modelFor }: QueryLetterActivityDeps): QueryLetterActivities {
  return {
    generateQueryLetter: (input) => generateQueryLetter(modelFor("chat"), input),
  };
}
