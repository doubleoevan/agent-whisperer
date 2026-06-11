import { listAgents as listAgentsQuery, V1_USER_ID, withUser, type Database } from "@agent-whisperer/database";
import type { AgentRow } from "@agent-whisperer/database";

// no input — schema is an empty object
export const listAgentsInputSchema = {};

/**
 * Returns every literary agent the v1 user has seeded.
 */
export async function listAgents(database: Database): Promise<AgentRow[]> {
  return withUser(database, V1_USER_ID, (transaction) => listAgentsQuery(transaction));
}
