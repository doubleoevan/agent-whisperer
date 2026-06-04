import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV1 } from "ai";

/**
 * The aliases app code is allowed to request. The literal-union type makes
 * typos a compile-time error. Aliases map to providers/models in LiteLLM's
 * config (infra/litellm/config.yaml) — never in app code.
 */
export type ModelAlias = "chat" | "chat-anthropic" | "chat-openai";

export type AiClientOptions = {
  /** LiteLLM base URL, e.g. http://localhost:4000 */
  baseUrl: string;
  /** LiteLLM virtual key. In v1 this equals LITELLM_MASTER_KEY. */
  apiKey: string;
};

/**
 * Builds a `modelFor(alias)` factory bound to a LiteLLM endpoint.
 *
 * Why a factory (vs. a singleton): each app entry point reads its config
 * once via `loadConfig()`, then constructs its AI client. Workflow code
 * never imports this directly — activities do.
 */
export function makeAi({ baseUrl, apiKey }: AiClientOptions): {
  modelFor: (alias: ModelAlias) => LanguageModelV1;
} {
  const provider = createOpenAICompatible({
    name: "litellm",
    baseURL: `${baseUrl.replace(/\/$/, "")}/v1`,
    apiKey,
  });
  return {
    modelFor: (alias) => provider.chatModel(alias),
  };
}
