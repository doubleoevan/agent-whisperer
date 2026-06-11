import { z } from "zod";
import type { AgentId, UserId } from "./ids.ts";

// how the agent prefers to receive a query; informs the composer's payload shape
export const AGENT_QUERY_METHOD = ["email", "queryManager", "queryTracker", "form", "other"] as const;
export type AgentQueryMethod = (typeof AGENT_QUERY_METHOD)[number];

// minimum agent fields needed for Days 5-6; Reedsy/MSWL ingest adds more in Days 7-8
export type Agent = {
  id: AgentId;
  userId: UserId;
  name: string;
  agency: string;
  // freeform required-materials string from the agent's listing (e.g. "Query + first 10 pages + 1-page synopsis")
  materials: string;
  queryMethod: AgentQueryMethod;
  queryUrl: string | null;
  email: string | null;
  notes: string | null;
};

// shared zod for tool inputs that name an agent's intake fields
export const seedAgentInputSchema = z.object({
  name: z.string().min(1),
  agency: z.string().min(1),
  materials: z.string().min(1),
  queryMethod: z.enum(AGENT_QUERY_METHOD),
  queryUrl: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type SeedAgentInput = z.infer<typeof seedAgentInputSchema>;
