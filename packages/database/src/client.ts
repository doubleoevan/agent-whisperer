import type { UserId } from "@agent-whisperer/domain";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema/index.ts";

export type Database = PostgresJsDatabase<typeof schema>;
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

/**
 * Builds a Drizzle client bound to the given connection string.
 */
export function makeDatabase(connectionString: string): { database: Database; close: () => Promise<void> } {
  const client = postgres(connectionString, { prepare: false });
  const database = drizzle(client, { schema });
  return { database, close: () => client.end({ timeout: 5 }) };
}

/**
 * Runs `fn` inside a transaction with the `app.user_id` session setting set, so row-level security scopes queries to this user.
 */
export async function withUser<T>(database: Database, userId: UserId, fn: (transaction: Transaction) => Promise<T>): Promise<T> {
  return database.transaction(async (transaction) => {
    await transaction.execute(sql`select set_config('app.user_id', ${userId}, true)`);
    return fn(transaction);
  });
}
