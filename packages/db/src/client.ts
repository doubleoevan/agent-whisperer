import type { UserId } from "@agent-whisperer/domain";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export type Db = PostgresJsDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Builds a Drizzle client bound to the given connection string.
 */
export function makeDb(connectionString: string): { db: Db; close: () => Promise<void> } {
  const client = postgres(connectionString, { prepare: false });
  const db = drizzle(client, { schema });
  return { db, close: () => client.end({ timeout: 5 }) };
}

/**
 * Runs `fn` inside a transaction with the `app.user_id` session setting set, so row-level security scopes queries to this user.
 */
export async function withUser<T>(db: Db, userId: UserId, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(tx);
  });
}
