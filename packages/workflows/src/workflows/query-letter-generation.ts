import { proxyActivities } from "@temporalio/workflow";
import type { LookupActivities, QueryLetter, QueryLetterActivities, AgentId, ManuscriptId, UserId } from "@agent-whisperer/domain";

const { loadManuscriptAndAgent } = proxyActivities<LookupActivities>({ startToCloseTimeout: "30 seconds" });
const { generateQueryLetter } = proxyActivities<QueryLetterActivities>({ startToCloseTimeout: "5 minutes", retry: { maximumAttempts: 2 } });

export type QueryLetterGenerationInput = {
  userId: UserId;
  manuscriptId: ManuscriptId;
  agentId: AgentId;
  voiceSamples?: string;
  preferences?: string;
};

/**
 * Loads manuscript+agent then drafts a structured query letter; standalone so the tool can iterate on the prompt without a full submission run.
 */
export async function queryLetterGenerationWorkflow(input: QueryLetterGenerationInput): Promise<QueryLetter> {
  const loadedContext = await loadManuscriptAndAgent({ userId: input.userId, manuscriptId: input.manuscriptId, agentId: input.agentId });
  return generateQueryLetter({
    manuscriptTitle: loadedContext.manuscriptTitle,
    manuscriptText: loadedContext.manuscriptText,
    agentName: loadedContext.agentName,
    agentAgency: loadedContext.agentAgency,
    agentMaterials: loadedContext.agentMaterials,
    voiceSamples: input.voiceSamples,
    preferences: input.preferences,
  });
}
