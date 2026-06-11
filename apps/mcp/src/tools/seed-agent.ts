import { z } from "zod";
import { insertAgent, V1_USER_ID, withUser, type Database } from "@agent-whisperer/database";
import { AGENT_QUERY_METHOD, type AgentId } from "@agent-whisperer/domain";

export const seedAgentInputSchema = {
  name: z.string().min(1).describe("Literary agent's full name"),
  agency: z.string().min(1).describe("Agency the agent works at"),
  materials: z.string().min(1).describe("Verbatim required-materials string from the agent's listing"),
  queryMethod: z.enum(AGENT_QUERY_METHOD).describe("How the agent wants the query delivered"),
  queryUrl: z.string().url().optional().describe("Submission form / QueryManager / QueryTracker url"),
  email: z.string().email().optional().describe("Submission email (when queryMethod is email)"),
  notes: z.string().optional().describe("Freeform notes (wishlist signals, comp signals, etc)"),
};

export type SeedAgentInput = {
  name: string;
  agency: string;
  materials: string;
  queryMethod: (typeof AGENT_QUERY_METHOD)[number];
  queryUrl?: string;
  email?: string;
  notes?: string;
};

/**
 * Inserts a single literary-agent row scoped to the v1 user.
 */
export async function seedAgent(database: Database, input: SeedAgentInput): Promise<{ agentId: AgentId }> {
  return withUser(database, V1_USER_ID, async (transaction) =>
    insertAgent(transaction, {
      userId: V1_USER_ID,
      name: input.name,
      agency: input.agency,
      materials: input.materials,
      queryMethod: input.queryMethod,
      queryUrl: input.queryUrl ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
    }),
  );
}
