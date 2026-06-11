import { generateObject } from "ai";
import type { LanguageModelV1 } from "ai";
import {
  queryLetterSchema,
  type QueryLetter,
  type QueryLetterGenerationInput,
} from "@agent-whisperer/domain";

const SYSTEM_PROMPT = `You are a literary-agency query letter coach helping an author tailor a single query letter to a specific agent.

The structure follows the conventional query letter format:
- A short personalization tied to the agent's stated interests (only if there is real overlap; otherwise leave personalization empty).
- A hook: one or two sentences capturing premise, protagonist, and central conflict.
- A pitch paragraph: 2-3 sentences expanding the hook with stakes, tone, and world.
- A category + word-count line.
- Optional comps: up to three "X meets Y" style comparable titles, only if they map cleanly to the manuscript.
- A book synopsis: ~150-250 words covering act structure end-to-end — queries do not hide endings.
- A short author bio drawn strictly from the supplied voice/preferences material (do not invent biography).
- A signoff.

Style discipline:
- Write only in the author's voice as evidenced by the manuscript text and any supplied voice samples. Do not impose generic "literary fiction" tone if the manuscript is propulsive thriller, or vice versa.
- Do not invent details that aren't in the manuscript or voice samples. If a piece of context is missing (no bio, no comps), return an empty string for that field.
- The agent's required-materials string describes what they want submitted. Shape the letter so it fits cleanly into that intake (e.g., if the agent asks only for query + first chapter, do not promise to include attachments).
- Do not reference yourself as an AI. Never name the manuscript or its characters in a way that suggests the letter is a template.

Optional learned preferences may bias style; if present, follow them. If absent, use sound default judgment.`;

function buildUserPrompt(input: QueryLetterGenerationInput): string {
  const sections: string[] = [];
  sections.push(`Manuscript title: ${input.manuscriptTitle}`);
  sections.push(`Target agent: ${input.agentName}, ${input.agentAgency}`);
  sections.push(`Agent's required submission materials (verbatim):\n${input.agentMaterials}`);
  if (input.voiceSamples && input.voiceSamples.trim() !== "") {
    sections.push(`Author voice samples:\n${input.voiceSamples}`);
  } else {
    sections.push("Author voice samples: (none supplied — infer voice strictly from the manuscript text)");
  }
  if (input.preferences && input.preferences.trim() !== "") {
    sections.push(`Learned author preferences (apply unless they conflict with the agent's stated wishes):\n${input.preferences}`);
  }
  // manuscript text last so it's the bulk of the user message; the model can scan top-matter for context
  sections.push(`Manuscript text (full):\n${input.manuscriptText}`);
  return sections.join("\n\n---\n\n");
}

/**
 * Generates a structured query letter for the given (manuscript, agent) pair; manuscript-agnostic — every concrete value flows from input.
 */
export async function generateQueryLetter(model: LanguageModelV1, input: QueryLetterGenerationInput): Promise<QueryLetter> {
  const { object } = await generateObject({
    model,
    schema: queryLetterSchema,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(input),
  });
  return object;
}
