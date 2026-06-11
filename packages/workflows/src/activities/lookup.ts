import type { Database } from "@agent-whisperer/database";
import { getAgent, getManuscript } from "@agent-whisperer/database";
import type { LookupActivities } from "@agent-whisperer/domain";

export type LookupActivityDeps = {
  adminDatabase: Database;
};

/**
 * Builds the shared loader activity used by both queryLetterGeneration and perAgentSubmission workflows.
 */
export function makeLookupActivities({ adminDatabase }: LookupActivityDeps): LookupActivities {
  return {
    loadManuscriptAndAgent: async ({ userId, manuscriptId, agentId }) => {
      const [manuscript, agent] = await Promise.all([
        getManuscript(adminDatabase, { userId, manuscriptId }),
        getAgent(adminDatabase, { userId, agentId }),
      ]);
      if (!manuscript) {
        throw new Error(`manuscript not found: id=${manuscriptId}`);
      }
      if (!agent) {
        throw new Error(`agent not found: id=${agentId}`);
      }
      return {
        manuscriptTitle: manuscript.title,
        manuscriptText: manuscript.text,
        agentName: agent.name,
        agentAgency: agent.agency,
        agentMaterials: agent.materials,
        agentQueryMethod: agent.queryMethod,
      };
    },
  };
}
