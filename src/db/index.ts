import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Schema = typeof schema;

// ─── Database detection ─────────────────────────────────────────────────
// PostgreSQL: set DATABASE_URL (local dev / any pg host)
// Cloudflare D1: unset DATABASE_URL, use wrangler DB binding in production
const DATABASE_URL = process.env.DATABASE_URL;
export const HAS_PG = Boolean(DATABASE_URL);

// Build the postgres pool and drizzle client only when DATABASE_URL is set.
let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<Schema>>;

if (HAS_PG) {
  const globalForDb = globalThis as typeof globalThis & {
    __autologinPgPool?: Pool;
  };

  _pool =
    globalForDb.__autologinPgPool ??
    new Pool({
      connectionString: DATABASE_URL!,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__autologinPgPool = _pool;
  }

  _db = drizzle(_pool, { schema });
} else {
  // D1 mode (Cloudflare Workers) — the DB binding is injected at runtime.
  // This cast lets TypeScript compile; the actual worker uses the real D1 binding.
  _db = drizzle(
    { prepare: () => ({ all: () => [], run: () => ({ success: true }), first: () => null }) } as any,
    { schema }
  ) as any;
}

export { _pool as pool };
export const db = _db;
export type DB = typeof db;
