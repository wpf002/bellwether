import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let _client: ReturnType<typeof postgres> | null = null;

export function getDb(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  if (!_client) _client = postgres(databaseUrl, { max: 10 });
  return drizzle(_client, { schema });
}

export type Database = ReturnType<typeof getDb>;
