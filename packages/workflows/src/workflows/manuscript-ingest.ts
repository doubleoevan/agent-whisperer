import { proxyActivities } from "@temporalio/workflow";
import type { IngestManuscriptInput, IngestManuscriptResult, ManuscriptIngestActivities } from "@agent-whisperer/domain";

const { acquireManuscriptDocx, parseDocxToText, saveManuscript } = proxyActivities<ManuscriptIngestActivities>({
  // drive export + mammoth parse should each finish well under a minute on a normal manuscript
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 3 },
});

/**
 * Acquires the manuscript .docx (drive export or local read), parses to plain text, persists as a manuscript row.
 */
export async function manuscriptIngestWorkflow(input: IngestManuscriptInput): Promise<IngestManuscriptResult> {
  const docx = await acquireManuscriptDocx(input.source);
  const parsedManuscript = await parseDocxToText(docx);
  // derive the identifier the row is keyed by; same value will round-trip on re-ingest
  const sourceIdentifier = input.source.kind === "drive" ? input.source.driveFileId : input.source.localPath;
  const { manuscriptId } = await saveManuscript({
    userId: input.userId,
    sourceKind: input.source.kind,
    sourceIdentifier,
    title: parsedManuscript.title,
    text: parsedManuscript.text,
  });
  return { manuscriptId, title: parsedManuscript.title, characterCount: parsedManuscript.text.length };
}
