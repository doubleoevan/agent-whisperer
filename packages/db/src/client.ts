import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Builds a Drizzle client. Stays env-free on purpose: workflow code can
 * transitively import this package, and reading env inside workflow modules
 * would break Temporal determinism.
 */
export function makeDb(connectionString: string): { db: Db; close: () => Promise<void> } {
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end({ timeout: 5 }) };
}

/**
 * Runs `fn` inside a transaction with `app.user_id` set, so RLS policies
 * scope all queries to this user. `set_config(..., true)` makes the GUC
 * transaction-local — auto-resets on commit/rollback.
 *
 * Every tenant-scoped DB call must go through this. The signature enforces
 * the discipline: the callback receives `tx`, not `db`.
 */
export async function withUser<T>(db: Db, userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
