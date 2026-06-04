import { ConfigSchema, type Config } from "./schema.ts";

export type { Config };
export { ConfigSchema };

/**
 * Validates `process.env` against the schema and returns a typed Config.
 * Call once at the entry point of each app (apps/mcp, apps/worker); never
 * read `process.env` directly elsewhere.
 *
 * Throws with a useful zod error on the first missing/invalid var, so a
 * misconfigured environment fails loudly at boot rather than mysteriously at
 * the first query.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}
