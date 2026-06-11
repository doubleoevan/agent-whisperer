import { condition, defineQuery, defineSignal, proxyActivities, setHandler, workflowInfo } from "@temporalio/workflow";
import {
  asWorkflowId,
  LETTER_FIELD_PATH,
  renderQueryLetter,
  SUBMISSION_EDIT_SIGNAL,
  SUBMISSION_FINALIZE_SIGNAL,
  SUBMISSION_GET_CURRENT_PAYLOAD_QUERY,
  type LookupActivities,
  type PerAgentSubmissionActivities,
  type PerAgentSubmissionInput,
  type PerAgentSubmissionResult,
  type QueryLetter,
  type QueryLetterActivities,
  type SubmissionEdit,
  type SubmissionField,
  type SubmissionPayload,
} from "@agent-whisperer/domain";

// signals used by edit/finalize mcp tools; queries used by get_submission
export const editSignal = defineSignal<[SubmissionEdit]>(SUBMISSION_EDIT_SIGNAL);
export const finalizeSignal = defineSignal<[]>(SUBMISSION_FINALIZE_SIGNAL);
export const getCurrentPayloadQuery = defineQuery<SubmissionPayload>(SUBMISSION_GET_CURRENT_PAYLOAD_QUERY);

const lookup = proxyActivities<LookupActivities>({ startToCloseTimeout: "30 seconds" });
const queryLetter = proxyActivities<QueryLetterActivities>({ startToCloseTimeout: "5 minutes", retry: { maximumAttempts: 2 } });
const submission = proxyActivities<PerAgentSubmissionActivities>({ startToCloseTimeout: "2 minutes", retry: { maximumAttempts: 2 } });

/**
 * Long-running submission workflow: drafts a letter + field bundle, accepts edits via signal, finalizes on signal.
 */
export async function perAgentSubmissionWorkflow(input: PerAgentSubmissionInput): Promise<PerAgentSubmissionResult> {
  // load and generate in parallel where possible — generation needs the manuscript, field-spec parse only needs materials
  const loadedContext = await lookup.loadManuscriptAndAgent({
    userId: input.userId,
    manuscriptId: input.manuscriptId,
    agentId: input.agentId,
  });

  const [letter, specs] = await Promise.all([
    queryLetter.generateQueryLetter({
      manuscriptTitle: loadedContext.manuscriptTitle,
      manuscriptText: loadedContext.manuscriptText,
      agentName: loadedContext.agentName,
      agentAgency: loadedContext.agentAgency,
      agentMaterials: loadedContext.agentMaterials,
      preferences: input.preferences,
    }),
    submission.parseSubmissionFieldSpecs({ agentMaterials: loadedContext.agentMaterials }),
  ]);

  let payload = await submission.composeSubmissionPayload({ userId: input.userId, letter, specs });

  const workflowId = asWorkflowId(workflowInfo().workflowId);
  const { submissionId } = await submission.saveSubmissionDraft({
    userId: input.userId,
    manuscriptId: input.manuscriptId,
    agentId: input.agentId,
    workflowId,
    payload,
  });

  // baseline row: capture the ai-generated letter as the first history entry before any human edits
  await submission.appendSubmissionFieldHistory({
    userId: input.userId,
    submissionId,
    fieldPath: LETTER_FIELD_PATH,
    beforeValue: null,
    afterValue: renderQueryLetter(payload.letter),
    source: "ai_default",
  });

  // expose live state to mcp tools without an extra db round-trip
  setHandler(getCurrentPayloadQuery, () => payload);

  // edit/finalize signal handlers feed flags consumed by the loop below
  const pendingEdits: SubmissionEdit[] = [];
  let isFinalizeRequested = false;

  setHandler(editSignal, (edit) => {
    pendingEdits.push(edit);
  });
  setHandler(finalizeSignal, () => {
    isFinalizeRequested = true;
  });

  // drain edits FIRST every iteration, then honor finalize — otherwise edits queued in the same workflow task as finalize get dropped
  while (true) {
    await condition(() => isFinalizeRequested || pendingEdits.length > 0);

    // drain everything currently queued; new edits arriving during the awaits below are caught by the next loop iteration
    while (pendingEdits.length > 0) {
      const edit = pendingEdits.shift()!;
      // capture before-values once, then apply and persist; history append always runs author_edit
      const beforeLetter = renderQueryLetter(payload.letter);
      const beforeFieldValuesByKey = new Map(payload.fields.map((field) => [field.key, field.value]));
      payload = applyEdit(payload, edit);

      if (edit.kind === "letter") {
        await submission.appendSubmissionFieldHistory({
          userId: input.userId,
          submissionId,
          fieldPath: LETTER_FIELD_PATH,
          beforeValue: beforeLetter,
          afterValue: renderQueryLetter(payload.letter),
          source: "author_edit",
        });
      } else {
        await submission.appendSubmissionFieldHistory({
          userId: input.userId,
          submissionId,
          fieldPath: edit.key,
          beforeValue: beforeFieldValuesByKey.get(edit.key) ?? null,
          afterValue: edit.value,
          source: "author_edit",
        });
      }

      await submission.updateSubmissionDraft({ submissionId, userId: input.userId, payload });
    }

    // queue drained synchronously after the last await — no signal can interpose between this check and the inner loop's exit
    if (isFinalizeRequested) {
      break;
    }
  }

  await submission.markSubmissionFinalized({ submissionId, userId: input.userId, payload });
  return { submissionId, payload };
}

// pure transformation: applies a single edit and re-derives letter-sourced fields the user hasn't claimed yet
function applyEdit(payload: SubmissionPayload, edit: SubmissionEdit): SubmissionPayload {
  if (edit.kind === "letter") {
    const updatedLetter: QueryLetter = (() => {
      // comps is string[]; everything else is string — split on commas as a convenience
      if (edit.field === "comps") {
        return { ...payload.letter, comps: edit.value.split(",").map((comp) => comp.trim()).filter((comp) => comp !== "") };
      }
      return { ...payload.letter, [edit.field]: edit.value };
    })();
    const rerenderedLetter = renderQueryLetter(updatedLetter);
    // only re-derive fields the user hasn't taken ownership of (source !== "user-edit")
    const fields: SubmissionField[] = payload.fields.map((field) => {
      if (field.source === "user-edit") {
        return field;
      }
      switch (field.fill) {
        case "letter:queryLetter": {
          return { ...field, value: rerenderedLetter, source: "letter" };
        }
        case "letter:synopsis": {
          return { ...field, value: updatedLetter.bookSynopsis, source: "letter" };
        }
        case "letter:bio": {
          return { ...field, value: updatedLetter.bioParagraph, source: "letter" };
        }
        default: {
          return field;
        }
      }
    });
    return { letter: updatedLetter, fields };
  }
  // edit.kind === "submissionField" — user claims ownership of this field
  const fields = payload.fields.map((field) =>
    field.key === edit.key ? { ...field, value: edit.value, source: "user-edit" as const } : field,
  );
  return { ...payload, fields };
}
