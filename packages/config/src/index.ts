import { ConfigSchema, type Config } from "./schema.ts";

export type { Config };
export { ConfigSchema };

/**
 * Validates `process.env` against the schema and returns a typed Config.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment:\n${issues}`);
  }
  return result.data;
}
