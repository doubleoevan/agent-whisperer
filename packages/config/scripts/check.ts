import { loadConfig } from "../src/index.ts";

// happy path: doppler-injected env validates
const validConfig = loadConfig();
console.log("✓ loadConfig() ok; NODE_ENV =", validConfig.NODE_ENV);

// invalid env: loadConfig throws with a useful message
try {
  loadConfig({ DATABASE_URL: "not-a-url", NODE_ENV: "development" } as NodeJS.ProcessEnv);
  console.error("✗ expected throw on invalid env");
  process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("DATABASE_URL")) {
    console.error("✗ wrong error:", message);
    process.exit(1);
  }
  console.log("✓ loadConfig() rejected invalid env with useful message");
}
