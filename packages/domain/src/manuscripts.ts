import type { ManuscriptId, UserId } from "./ids.ts";

// where a manuscript came from; drive routes through composio export, local reads bytes off disk
export type ManuscriptSourceKind = "drive" | "local";

export type ManuscriptSource =
  | { kind: "drive"; driveFileId: string }
  | { kind: "local"; localPath: string };

export type Manuscript = {
  id: ManuscriptId;
  userId: UserId;
  sourceKind: ManuscriptSourceKind;
  // drive file id for kind="drive", absolute local path for kind="local"
  sourceIdentifier: string;
  title: string;
  text: string;
  ingestedAt: string;
};

export type IngestManuscriptInput = {
  userId: UserId;
  source: ManuscriptSource;
};

export type IngestManuscriptResult = {
  manuscriptId: ManuscriptId;
  title: string;
  characterCount: number;
};

// raw bytes after acquisition; passed between activities
export type DocxExport = {
  filename: string;
  bytesBase64: string;
};

export type ManuscriptIngestActivities = {
  acquireManuscriptDocx: (source: ManuscriptSource) => Promise<DocxExport>;
  parseDocxToText: (docx: DocxExport) => Promise<{ title: string; text: string }>;
  saveManuscript: (input: { userId: UserId; sourceKind: ManuscriptSourceKind; sourceIdentifier: string; title: string; text: string }) => Promise<{ manuscriptId: ManuscriptId }>;
};
