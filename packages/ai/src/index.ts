import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV1 } from "ai";

// aliases the app may request; mapped to providers in infrastructure/litellm/config.yaml
export type ModelAlias = "chat" | "chat-anthropic" | "chat-openai";

export type AiClientOptions = {
  baseUrl: string;
  apiKey: string;
};

/**
 * Builds a `modelFor(alias)` factory bound to a LiteLLM endpoint.
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
