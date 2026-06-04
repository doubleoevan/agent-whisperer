/**
 * 2-provider smoke test. Proves the full app → LiteLLM → provider loop.
 *
 *   chat-anthropic  -> Anthropic only        (deterministic)
 *   chat-openai     -> OpenAI only           (deterministic)
 *   chat            -> load-balanced both    (alias hides routing)
 */
import { generateText } from "ai";
import { makeAi, type ModelAlias } from "../src/index.ts";

const baseUrl = process.env["LITELLM_BASE_URL"];
const apiKey = process.env["LITELLM_API_KEY"];
if (!baseUrl || !apiKey) {
  console.error("LITELLM_BASE_URL and LITELLM_API_KEY required.");
  process.exit(1);
}

const { modelFor } = makeAi({ baseUrl, apiKey });

const prompt = "Reply with exactly one word: your provider name (anthropic or openai).";

const aliases: readonly ModelAlias[] = ["chat-anthropic", "chat-openai", "chat"];

let failures = 0;
for (const alias of aliases) {
  try {
    const t0 = Date.now();
    const { text, response } = await generateText({
      model: modelFor(alias),
      prompt,
      maxTokens: 16,
    });
    const dt = Date.now() - t0;
    console.log(`✓ ${alias.padEnd(15)} -> "${text.trim()}"  (model=${response.modelId}, ${dt}ms)`);
  } catch (err) {
    failures += 1;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ ${alias}: ${msg}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} alias(es) failed`);
  process.exit(1);
}
console.log("\nAll aliases ok.");
