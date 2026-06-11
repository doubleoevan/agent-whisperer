import { z } from "zod";
import type { AgentId, ManuscriptId, SubmissionId, UserId, WorkflowId } from "./ids.ts";
import type { QueryLetter } from "./query-letter.ts";

// one field of the agent's intake form (whether the agent uses email, QueryManager, QueryTracker, or a custom form)
export type SubmissionFieldSource = "letter" | "library" | "blank" | "user-edit";
export type SubmissionFieldFill = "letter:queryLetter" | "letter:synopsis" | "letter:bio" | "library" | "manual";
export type SubmissionField = {
  key: string;
  label: string;
  value: string;
  // tracked so the learn-loop can later score where values came from
  source: SubmissionFieldSource;
  // preserved so the workflow can re-derive letter-sourced fields when the letter changes
  fill: SubmissionFieldFill;
};

// the copy-paste-ready bundle returned to the user
export type SubmissionPayload = {
  letter: QueryLetter;
  fields: SubmissionField[];
};

// a single edit applied via signal; discriminated so handlers branch cleanly
export type SubmissionEdit =
  | { kind: "letter"; field: keyof QueryLetter; value: string }
  | { kind: "submissionField"; key: string; value: string };

export const submissionEditSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("letter"),
    field: z.enum([
      "personalization",
      "hook",
      "pitchParagraph",
      "bookSynopsis",
      "comps",
      "category",
      "wordCount",
      "bioParagraph",
      "signoff",
    ]),
    value: z.string(),
  }),
  z.object({
    kind: z.literal("submissionField"),
    key: z.string().min(1),
    value: z.string(),
  }),
]);

// llm-parsed spec for an agent's intake fields (output of parseSubmissionFieldSpecs)
export const submissionFieldSpecSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  // composer fill strategy; letter:* slots draw from the generated letter, library looks up `key`, manual is left blank
  fill: z.enum(["letter:queryLetter", "letter:synopsis", "letter:bio", "library", "manual"]),
});
export type SubmissionFieldSpec = z.infer<typeof submissionFieldSpecSchema>;

export const submissionFieldSpecListSchema = z.object({
  specs: z.array(submissionFieldSpecSchema).min(1).max(20),
});

// shared row fields; each status variant adds its own finalizedAt shape
type SubmissionBase = {
  id: SubmissionId;
  userId: UserId;
  manuscriptId: ManuscriptId;
  agentId: AgentId;
  workflowId: WorkflowId;
  payload: SubmissionPayload;
  createdAt: string;
  updatedAt: string;
};

export type Submission =
  | (SubmissionBase & { status: "drafting"; finalizedAt: null })
  | (SubmissionBase & { status: "finalized"; finalizedAt: string });

export type PerAgentSubmissionInput = {
  userId: UserId;
  manuscriptId: ManuscriptId;
  agentId: AgentId;
  // optional learned preferences passed through to query letter generation; empty in v1
  preferences?: string;
};

export type PerAgentSubmissionResult = {
  submissionId: SubmissionId;
  payload: SubmissionPayload;
};

// loader contract shared between query-letter generation and the per-agent submission workflow
export type LoadedManuscriptAndAgent = {
  manuscriptTitle: string;
  manuscriptText: string;
  agentName: string;
  agentAgency: string;
  agentMaterials: string;
  agentQueryMethod: string;
};

export type LookupActivities = {
  loadManuscriptAndAgent: (input: { userId: UserId; manuscriptId: ManuscriptId; agentId: AgentId }) => Promise<LoadedManuscriptAndAgent>;
};

// signal / query names shared between the workflow definition and the mcp tools that signal/query it
export const SUBMISSION_EDIT_SIGNAL = "edit";
export const SUBMISSION_FINALIZE_SIGNAL = "finalize";
export const SUBMISSION_GET_CURRENT_PAYLOAD_QUERY = "getCurrentPayload";

// who authored a history row; "ai_default" baselines the initial llm output, "author_edit" captures human edits
export type SubmissionHistorySource = "ai_default" | "author_edit";

// fieldPath sentinel for the rendered query letter; everything else is a submission-field key
export const LETTER_FIELD_PATH = "letter";

export type PerAgentSubmissionActivities = {
  parseSubmissionFieldSpecs: (input: { agentMaterials: string }) => Promise<SubmissionFieldSpec[]>;
  composeSubmissionPayload: (input: {
    userId: UserId;
    letter: QueryLetter;
    specs: SubmissionFieldSpec[];
  }) => Promise<SubmissionPayload>;
  saveSubmissionDraft: (input: {
    userId: UserId;
    manuscriptId: ManuscriptId;
    agentId: AgentId;
    workflowId: WorkflowId;
    payload: SubmissionPayload;
  }) => Promise<{ submissionId: SubmissionId }>;
  updateSubmissionDraft: (input: { submissionId: SubmissionId; userId: UserId; payload: SubmissionPayload }) => Promise<void>;
  markSubmissionFinalized: (input: { submissionId: SubmissionId; userId: UserId; payload: SubmissionPayload }) => Promise<void>;
  appendSubmissionFieldHistory: (input: {
    userId: UserId;
    submissionId: SubmissionId;
    fieldPath: string;
    beforeValue: string | null;
    afterValue: string;
    source: SubmissionHistorySource;
  }) => Promise<void>;
};
