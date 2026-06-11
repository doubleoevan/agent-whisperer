import { parseSubmissionFieldSpecs, type ModelFor } from "@agent-whisperer/ai";
import {
  appendSubmissionFieldHistoryEntry,
  listFieldLibrary,
  markSubmissionFinalized as markSubmissionFinalizedDb,
  updateSubmissionPayload,
  upsertSubmissionDraft,
  type Database,
} from "@agent-whisperer/database";
import {
  renderQueryLetter,
  type PerAgentSubmissionActivities,
  type SubmissionField,
  type SubmissionFieldSource,
  type SubmissionPayload,
} from "@agent-whisperer/domain";

export type SubmissionActivityDeps = {
  modelFor: ModelFor;
  adminDatabase: Database;
};

/**
 * Builds the per-agent submission activities (field-spec parse, payload compose, persist transitions).
 */
export function makeSubmissionActivities({ modelFor, adminDatabase }: SubmissionActivityDeps): PerAgentSubmissionActivities {
  return {
    parseSubmissionFieldSpecs: ({ agentMaterials }) => parseSubmissionFieldSpecs(modelFor("chat"), agentMaterials),

    composeSubmissionPayload: async ({ userId, letter, specs }) => {
      const libraryRows = await listFieldLibrary(adminDatabase, { userId });
      const libraryByKey = new Map(libraryRows.map((row) => [row.key, row.value]));
      const renderedLetter = renderQueryLetter(letter);

      const fields: SubmissionField[] = specs.map((spec) => {
        let value = "";
        let source: SubmissionFieldSource = "blank";
        // map letter slots first; library lookups by key; manual fields left blank
        switch (spec.fill) {
          case "letter:queryLetter": {
            value = renderedLetter;
            source = "letter";
            break;
          }
          case "letter:synopsis": {
            value = letter.bookSynopsis;
            source = "letter";
            break;
          }
          case "letter:bio": {
            value = letter.bioParagraph;
            source = "letter";
            break;
          }
          case "library": {
            const libraryValue = libraryByKey.get(spec.key);
            if (libraryValue !== undefined) {
              value = libraryValue;
              source = "library";
            }
            break;
          }
          case "manual": {
            break;
          }
        }
        return { key: spec.key, label: spec.label, value, source, fill: spec.fill };
      });

      return { letter, fields } satisfies SubmissionPayload;
    },

    saveSubmissionDraft: ({ userId, manuscriptId, agentId, workflowId, payload }) =>
      upsertSubmissionDraft(adminDatabase, { userId, manuscriptId, agentId, workflowId, payload }),

    updateSubmissionDraft: ({ submissionId, userId, payload }) =>
      updateSubmissionPayload(adminDatabase, { submissionId, userId, payload }),

    markSubmissionFinalized: ({ submissionId, userId, payload }) =>
      markSubmissionFinalizedDb(adminDatabase, { submissionId, userId, payload }),

    appendSubmissionFieldHistory: (input) => appendSubmissionFieldHistoryEntry(adminDatabase, input),
  };
}
