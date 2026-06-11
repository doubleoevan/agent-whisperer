import { generateObject } from "ai";
import type { LanguageModelV1 } from "ai";
import {
  submissionFieldSpecListSchema,
  type SubmissionFieldSpec,
} from "@agent-whisperer/domain";

const SYSTEM_PROMPT = `You parse a literary agent's free-text "required submission materials" string into a structured list of intake fields the author needs to fill.

Output rules:
- Produce one entry per distinct field the agent asks for, in the order the agent lists them.
- "key" is a short snake_case identifier (e.g. "query_letter", "first_chapter", "synopsis", "first_ten_pages", "comp_titles").
- "label" is the human-readable label that mirrors the agent's wording.
- "fill" is how the author's existing material can populate the field:
  - "letter:queryLetter" — the rendered query letter goes here verbatim
  - "letter:synopsis" — the synopsis paragraph from the query letter goes here
  - "letter:bio" — the bio paragraph from the query letter goes here
  - "library" — the author has likely answered this before and the field-library may have a saved value
  - "manual" — the author must fill this themselves (e.g., page excerpts the system cannot produce from the letter alone)
- Always include at minimum a "query_letter" entry filled by "letter:queryLetter".
- Manuscript excerpts (first N pages, first chapter, sample chapter) must be "manual" — the system does not slice the manuscript.`;

/**
 * Parses an agent's free-text required-materials string into a structured list of fields the author must fill.
 */
export async function parseSubmissionFieldSpecs(model: LanguageModelV1, agentMaterials: string): Promise<SubmissionFieldSpec[]> {
  const { object } = await generateObject({
    model,
    schema: submissionFieldSpecListSchema,
    system: SYSTEM_PROMPT,
    prompt: `Agent's required submission materials (verbatim):\n\n${agentMaterials}`,
  });
  return object.specs;
}
