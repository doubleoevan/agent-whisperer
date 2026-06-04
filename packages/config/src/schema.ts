import { z } from "zod";

// single source of truth for env vars; loadConfig() returns only these
export const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // app role connection (row-level security applies)
  DATABASE_URL: z.string().url(),
  // superuser connection (bypasses row-level security); only needed by migrations/admin
  DATABASE_URL_ADMIN: z.string().url().optional(),

  // LiteLLM gateway; provider keys live with LiteLLM, not the app
  LITELLM_BASE_URL: z.string().url(),
  LITELLM_API_KEY: z.string().min(1),

  // local `temporal server start-dev` defaults
  TEMPORAL_ADDRESS: z.string().min(1).default("localhost:7233"),
  TEMPORAL_NAMESPACE: z.string().min(1).default("default"),
});

export type Config = z.infer<typeof ConfigSchema>;
