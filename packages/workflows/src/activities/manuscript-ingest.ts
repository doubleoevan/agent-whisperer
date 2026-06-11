import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import type { Composio } from "@composio/core";
import mammoth from "mammoth";
import type { Database } from "@agent-whisperer/database";
import { upsertManuscript } from "@agent-whisperer/database";
import type { ManuscriptIngestActivities } from "@agent-whisperer/domain";

// google docs export as the .docx workspace format; mime is plumbed through to drive's files.export
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type ManuscriptIngestActivityDeps = {
  composio: Composio;
  adminDatabase: Database;
  // composio "user id" used to scope tool calls to the v1 connection; same string passed everywhere in v1
  composioUserId: string;
  // resolved at worker boot via composio.tools.getRawComposioTools — the "Export Google Workspace file" action
  googleExportActionSlug: string;
};

/**
 * Builds manuscript-ingest activities bound to a composio client + admin db connection.
 */
export function makeManuscriptIngestActivities({
  composio,
  adminDatabase,
  composioUserId,
  googleExportActionSlug,
}: ManuscriptIngestActivityDeps): ManuscriptIngestActivities {
  return {
    acquireManuscriptDocx: async (source) => {
      // route by source.kind; drive uses composio, local reads bytes off disk
      if (source.kind === "drive") {
        const response = await composio.tools.execute(googleExportActionSlug, {
          userId: composioUserId,
          arguments: {
            file_id: source.driveFileId,
            mime_type: DOCX_MIME_TYPE,
          },
        });
        // with dangerouslyAllowAutoUploadDownloadFiles, the file is downloaded to disk and the response carries { filePath, name, mimeType, s3Url }
        const exportPayload = (response as { data?: Record<string, unknown> }).data ?? {};
        const fileDescriptor = findFileDescriptor(exportPayload);
        if (!fileDescriptor) {
          throw new Error(`google drive export returned no downloaded file for ${source.driveFileId}; payload keys=${Object.keys(exportPayload).join(",")}`);
        }
        const driveBuffer = await readFile(fileDescriptor.filePath);
        const driveFilename = fileDescriptor.name !== "" ? fileDescriptor.name : `${source.driveFileId}.docx`;
        return { filename: driveFilename, bytesBase64: driveBuffer.toString("base64") };
      }
      // local file: trust the absolute path the caller supplied (single-user v1; multi-user adds an allowlist later)
      const localBuffer = await readFile(source.localPath);
      const localFilename = source.localPath.split("/").pop() ?? "manuscript.docx";
      return { filename: localFilename, bytesBase64: localBuffer.toString("base64") };
    },

    parseDocxToText: async (docx) => {
      const buffer = Buffer.from(docx.bytesBase64, "base64");
      const { value: rawText } = await mammoth.extractRawText({ buffer });
      // prefer the source filename (minus .docx) as title; fall back to first non-empty line; final fallback "Untitled"
      const filenameTitle = docx.filename.replace(/\.docx$/i, "").trim();
      const firstLine = rawText.split("\n").map((line) => line.trim()).find((line) => line !== "");
      const title = filenameTitle !== "" ? filenameTitle : firstLine ?? "Untitled";
      return { title, text: rawText };
    },

    saveManuscript: async (input) => upsertManuscript(adminDatabase, input),
  };
}

// composio's file-download modifier replaces file-shaped output with { filePath, name, mimeType, s3Url };
// the key it lives under varies per action, so we scan for the first object carrying a filePath string
function findFileDescriptor(payload: Record<string, unknown>): { filePath: string; name: string } | null {
  for (const candidate of Object.values(payload)) {
    if (typeof candidate !== "object" || candidate === null) {
      continue;
    }
    const filePath = (candidate as Record<string, unknown>)["filePath"];
    if (typeof filePath !== "string" || filePath === "") {
      continue;
    }
    const name = (candidate as Record<string, unknown>)["name"];
    return { filePath, name: typeof name === "string" ? name : "" };
  }
  return null;
}
