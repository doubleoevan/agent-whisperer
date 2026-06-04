import { z } from "zod";

/**
 * The single source of truth for env vars the app reads. Add new vars here
 * as later steps land (Temporal address in Step 5, LiteLLM in Step 4, etc).
 * Anything not in this schema is invisible to the app — `loadConfig()`
 * returns *only* validated, typed fields.
 */
export const ConfigSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Runtime app-role connection. Subject to RLS.
  DATABASE_URL: z.string().url(),
  // Migration-time superuser connection. Bypasses RLS. Optional at runtime —
  // only `pnpm db:migrate` and admin scripts need it.
  DATABASE_URL_ADMIN: z.string().url().optional(),

  // LiteLLM gateway. The app only knows the base URL + a virtual key;
  // provider keys (Anthropic, OpenAI, etc) are scoped to LiteLLM the service.
  LITELLM_BASE_URL: z.string().url(),
  LITELLM_API_KEY: z.string().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;
