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

// call each alias once; the load-balanced `chat` may land on either provider
for (const alias of aliases) {
  try {
    const startedAt = Date.now();
    const { text, response } = await generateText({
      model: modelFor(alias),
      prompt,
      maxTokens: 16,
    });
    const elapsedMs = Date.now() - startedAt;
    console.log(`✓ ${alias.padEnd(15)} -> "${text.trim()}"  (model=${response.modelId}, ${elapsedMs}ms)`);
  } catch (error) {
    failures += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${alias}: ${message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} alias(es) failed`);
  process.exit(1);
}
console.log("\nAll aliases ok.");
