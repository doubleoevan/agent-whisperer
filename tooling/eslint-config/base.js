import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** Flat-config base shared across the monorepo. */
export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.turbo/**",
      "**/node_modules/**",
      "**/drizzle/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // workflow code (deterministic) may only import domain contracts and Temporal's workflow SDK
  {
    files: ["packages/workflows/src/workflows/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@agent-whisperer/*", "!@agent-whisperer/domain"],
              message:
                "Workflow code must be deterministic; import contracts from @agent-whisperer/domain. Side effects live in activities.",
            },
            {
              group: ["node:*", "fs", "fs/*", "path", "child_process", "http", "https", "net", "dns", "crypto"],
              message:
                "Workflow code must be deterministic; perform I/O and side effects in activities.",
            },
          ],
        },
      ],
    },
  },
);
