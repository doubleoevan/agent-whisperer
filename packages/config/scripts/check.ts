import { loadConfig } from "../src/index.ts";

// 1. With Doppler-injected env, loadConfig succeeds and returns typed fields.
const ok = loadConfig();
console.log("✓ loadConfig() ok; NODE_ENV =", ok.NODE_ENV);

// 2. With a deliberately-bad env, loadConfig throws with a clear message.
try {
  loadConfig({ DATABASE_URL: "not-a-url", NODE_ENV: "development" } as NodeJS.ProcessEnv);
  console.error("✗ expected throw on invalid env");
  process.exit(1);
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  if (!msg.includes("DATABASE_URL")) {
    console.error("✗ wrong error:", msg);
    process.exit(1);
  }
  console.log("✓ loadConfig() rejected invalid env with useful message");
}
