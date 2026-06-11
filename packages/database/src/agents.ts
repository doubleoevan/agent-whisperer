import type { AgentId, AgentQueryMethod, SeedAgentInput, UserId } from "@agent-whisperer/domain";
import { and, eq } from "drizzle-orm";
import type { Database, Transaction } from "./client.ts";
import { agents, type AgentRow } from "./schema/agents.ts";

// re-export so apps don't have to reach into ./schema for the row type
export type { AgentRow };

/**
 * Inserts a literary-agent row scoped to the current user; called inside withUser by mcp tools.
 */
export async function insertAgent(transaction: Transaction, input: SeedAgentInput & { userId: UserId }): Promise<{ agentId: AgentId }> {
  const [row] = await transaction
    .insert(agents)
    .values({
      userId: input.userId,
      name: input.name,
      agency: input.agency,
      materials: input.materials,
      queryMethod: input.queryMethod,
      queryUrl: input.queryUrl ?? null,
      email: input.email ?? null,
      notes: input.notes ?? null,
    })
    .returning({ id: agents.id });
  if (!row) {
    throw new Error("insertAgent returned no row");
  }
  return { agentId: row.id };
}

/**
 * Lists every agent visible under the current user-scoped transaction.
 */
export async function listAgents(transaction: Transaction): Promise<AgentRow[]> {
  return transaction.select().from(agents);
}

/**
 * Reads a single agent by id under admin connection; activities use this.
 */
export async function getAgent(database: Database, input: { userId: UserId; agentId: AgentId }): Promise<AgentRow | null> {
  const rows = await database
    .select()
    .from(agents)
    .where(and(eq(agents.userId, input.userId), eq(agents.id, input.agentId)))
    .limit(1);
  return rows[0] ?? null;
}

export type { AgentQueryMethod };
