import { Client, Connection } from "@temporalio/client";
import { loadConfig } from "@agent-whisperer/config";
import {
  getManuscript,
  getSubmissionByWorkflowIdAdmin,
  listSubmissionFieldHistoryForSubmission,
  makeDatabase,
  V1_USER_ID,
} from "@agent-whisperer/database";
import { asSubmissionId, asWorkflowId, type SubmissionId } from "@agent-whisperer/domain";
import { editSubmission } from "../src/tools/edit-submission.ts";
import { getSubmission } from "../src/tools/get-submission.ts";
import { ingestManuscript } from "../src/tools/ingest-manuscript.ts";
import { seedAgent } from "../src/tools/seed-agent.ts";
import { startSubmission } from "../src/tools/start-submission.ts";

const LOCAL_PATH = process.argv[2];
if (!LOCAL_PATH) {
  console.error("usage: tsx smoke-local-ingest.ts <absolute-path-to-docx>");
  process.exit(1);
}

const config = loadConfig();
if (!config.DATABASE_URL_ADMIN) {
  throw new Error("DATABASE_URL_ADMIN required to read submission_field_history rows (rls blocks otherwise)");
}

const { database, close: closeDatabase } = makeDatabase(config.DATABASE_URL);
const { database: adminDatabase, close: closeAdminDatabase } = makeDatabase(config.DATABASE_URL_ADMIN);
const temporalConnection = await Connection.connect({ address: config.TEMPORAL_ADDRESS });
const temporalClient = new Client({ connection: temporalConnection, namespace: config.TEMPORAL_NAMESPACE });

const shortenForLog = (value: string, limit = 120): string => value.length <= limit ? value : `${value.slice(0, limit)}…(+${value.length - limit} chars)`;

try {
  // -----------------------------------------------------------
  console.log("=== STEP 1: ingest_manuscript (local path) ===");
  console.log(`localPath=${LOCAL_PATH}`);
  const ingested = await ingestManuscript({ database, temporalClient }, { localPath: LOCAL_PATH });
  console.log(`✓ workflow result: manuscriptId=${ingested.manuscriptId} title="${ingested.title}" characterCount=${ingested.characterCount}`);

  // confirm row in db
  const manuscriptRow = await getManuscript(adminDatabase, { userId: V1_USER_ID, manuscriptId: ingested.manuscriptId });
  if (!manuscriptRow) {
    throw new Error("manuscripts row not found in db");
  }
  if (manuscriptRow.text.length === 0) {
    throw new Error("manuscripts row has empty text");
  }
  console.log(`✓ db row: sourceKind=${manuscriptRow.sourceKind} sourceIdentifier=${manuscriptRow.sourceIdentifier}`);
  console.log(`✓ db row: text.length=${manuscriptRow.text.length}, first 200 chars: ${shortenForLog(manuscriptRow.text, 200)}`);

  // -----------------------------------------------------------
  console.log("");
  console.log("=== STEP 2: seed_agent ===");
  const seeded = await seedAgent(database, {
    name: `Smoke Test Agent ${Date.now()}`,
    agency: "Smoke Test Literary Agency",
    materials: "Query letter pasted in body + first ten pages pasted below. No attachments.",
    queryMethod: "email",
    email: "smoke-test@example.com",
    notes: "open to thriller / suspense; smoke-test fixture",
  });
  console.log(`✓ agentId=${seeded.agentId}`);

  // -----------------------------------------------------------
  console.log("");
  console.log("=== STEP 3: start_submission ===");
  const { workflowId } = await startSubmission(database, {
    manuscriptId: ingested.manuscriptId,
    agentId: seeded.agentId,
  });
  console.log(`✓ workflowId=${workflowId}`);

  // wait for the workflow to compose + save the initial draft (db row appears after saveSubmissionDraft)
  console.log("waiting for workflow to compose draft (letter + field-spec parse run two LLM calls)...");
  let submissionId: SubmissionId | null = null;
  const startedAt = Date.now();
  while (!submissionId) {
    if (Date.now() - startedAt > 180_000) {
      throw new Error("workflow did not save submissions row within 180s — check worker logs");
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const draftRow = await getSubmissionByWorkflowIdAdmin(adminDatabase, asWorkflowId(workflowId));
    if (draftRow) {
      submissionId = asSubmissionId(draftRow.id);
    }
  }
  console.log(`✓ submissionId=${submissionId} (draft saved in ${((Date.now() - startedAt) / 1000).toFixed(1)}s)`);

  // -----------------------------------------------------------
  console.log("");
  console.log("=== STEP 3.5: get_submission — show me the letter ===");
  const livePayload = await getSubmission(temporalClient, { workflowId });
  console.log(JSON.stringify(livePayload.letter, null, 2));

  console.log("");
  console.log("--- composed fields (truncated) ---");
  for (const field of livePayload.fields) {
    console.log(`  [${field.source}] ${field.key} (${field.fill}) → ${shortenForLog(field.value, 120)}`);
  }

  // -----------------------------------------------------------
  console.log("");
  console.log("=== STEP 3.6: verify baseline ai_default row in submission_field_history ===");
  const historyAfterBaseline = await listSubmissionFieldHistoryForSubmission(adminDatabase, { userId: V1_USER_ID, submissionId });
  const baselineRow = historyAfterBaseline.find((row) => row.source === "ai_default");
  if (!baselineRow) {
    throw new Error("no ai_default baseline row found in submission_field_history");
  }
  console.log(`✓ baseline row: source=${baselineRow.source} fieldPath=${baselineRow.fieldPath} beforeValue=${baselineRow.beforeValue === null ? "null" : "(not null)"} afterValue.length=${baselineRow.afterValue.length}`);

  // -----------------------------------------------------------
  console.log("");
  console.log("=== STEP 4: edit_submission — small change to letter.hook ===");
  const newHook = `SMOKE-TEST EDIT (${new Date().toISOString()}): an ex-CIA hacker stumbles onto an algorithmic conspiracy buried in dark-pool order flow.`;
  console.log(`new hook: ${newHook}`);
  await editSubmission(temporalClient, {
    workflowId,
    edit: { kind: "letter", field: "hook", value: newHook },
  });

  // give the workflow a moment to process the signal + persist history
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const historyAfterEdit = await listSubmissionFieldHistoryForSubmission(adminDatabase, { userId: V1_USER_ID, submissionId });
  const authorEditRow = historyAfterEdit.find((row) => row.source === "author_edit");
  if (!authorEditRow) {
    throw new Error("no author_edit row found in submission_field_history after edit signal");
  }
  console.log(`✓ author_edit row: fieldPath=${authorEditRow.fieldPath} beforeValue.length=${authorEditRow.beforeValue?.length ?? 0} afterValue.length=${authorEditRow.afterValue.length}`);

  // -----------------------------------------------------------
  console.log("");
  console.log("=== STEP 5: full submission_field_history for this submission ===");
  for (const row of historyAfterEdit) {
    console.log("");
    console.log(`  id=${row.id}`);
    console.log(`  editedAt=${row.editedAt.toISOString()}`);
    console.log(`  source=${row.source}  fieldPath=${row.fieldPath}`);
    console.log(`  before: ${row.beforeValue === null ? "(null)" : shortenForLog(row.beforeValue, 200)}`);
    console.log(`  after : ${shortenForLog(row.afterValue, 200)}`);
  }

  console.log("");
  console.log(`✓ smoke complete. v1_user=${V1_USER_ID} workflowId=${workflowId} submissionId=${submissionId}`);
  console.log("workflow is still running (waiting for further edits or finalize_submission).");
} finally {
  await temporalConnection.close();
  await closeDatabase();
  await closeAdminDatabase();
}
