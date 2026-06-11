import { z } from "zod";

// the validated llm output; structured so the composer can drop slots into agent-required fields
export const queryLetterSchema = z.object({
  // optional 1-2 sentence hook tying the letter to the agent (uses agent's wishlist if available); empty string if no personalization possible
  personalization: z.string(),
  // the elevator pitch: ~1-2 sentences capturing premise, protagonist, central conflict
  hook: z.string(),
  // 2-3 sentence pitch paragraph that expands on the hook (stakes, tone, world)
  pitchParagraph: z.string(),
  // ~150-250 word synopsis covering act structure end-to-end (queries don't hide endings)
  bookSynopsis: z.string(),
  // up to 3 comp titles with one-line "X meets Y" framing
  comps: z.array(z.string()).max(5),
  // genre/category label (e.g. "adult thriller", "upmarket suspense")
  category: z.string(),
  // word count rounded to nearest thousand (e.g. "92,000 words"); empty string if unknown
  wordCount: z.string(),
  // 1-2 sentence author bio drawing only on supplied voice samples / preferences; empty string if no material given
  bioParagraph: z.string(),
  // closing line; "Thank you for your time and consideration." is a fine default
  signoff: z.string(),
});

export type QueryLetter = z.infer<typeof queryLetterSchema>;

// inputs to generation; manuscript-agnostic — every concrete value is supplied at call time
export type QueryLetterGenerationInput = {
  // full plain-text manuscript content
  manuscriptText: string;
  // human-readable manuscript title (used to ground the letter)
  manuscriptTitle: string;
  // the literary agent's name (used for personalization slot)
  agentName: string;
  // the agent's agency (used for personalization slot)
  agentAgency: string;
  // the agent's required-materials string verbatim; shapes the letter so it fits what the agent asks for
  agentMaterials: string;
  // optional author voice snippets (interviews, prior bios) the letter can draw from
  voiceSamples?: string;
  // optional learned preferences (style nudges, banned phrases, etc.); empty/ignored in v1
  preferences?: string;
};

export type QueryLetterActivities = {
  generateQueryLetter: (input: QueryLetterGenerationInput) => Promise<QueryLetter>;
};

/**
 * Renders a structured query letter as a plain-text block in conventional order; pure formatter, no llm involvement.
 */
export function renderQueryLetter(letter: QueryLetter): string {
  const parts: string[] = [];
  if (letter.personalization.trim() !== "") {
    parts.push(letter.personalization.trim());
  }
  // hook + pitch paragraph form the body of the letter
  parts.push([letter.hook.trim(), letter.pitchParagraph.trim()].filter((part) => part !== "").join("\n\n"));
  // metadata line: category + word count, joined when both present
  const metadataPieces = [letter.category.trim(), letter.wordCount.trim()].filter((piece) => piece !== "");
  if (metadataPieces.length > 0) {
    parts.push(metadataPieces.join(", ") + ".");
  }
  // comps come right before synopsis when supplied
  if (letter.comps.length > 0) {
    parts.push(`Comps: ${letter.comps.join("; ")}.`);
  }
  parts.push(letter.bookSynopsis.trim());
  if (letter.bioParagraph.trim() !== "") {
    parts.push(letter.bioParagraph.trim());
  }
  parts.push(letter.signoff.trim());
  return parts.filter((part) => part !== "").join("\n\n");
}
