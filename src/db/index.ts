// ─── Database Client (Multi-Backend) ────────────────────────────────────
// Supports three backends, auto-detected from environment:
//
//   1. PostgreSQL   → DATABASE_URL=postgresql://...
//   2. Turso/libSQL → DATABASE_URL=libsql://...  (or TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)
//   3. Cloudflare D1→ DATABASE_URL empty (binding injected at runtime)
//
// All three expose the same Drizzle query API (.select/.insert/.update/.delete).
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { config } from "@/lib/config";
import * as schema from "./schema";

// The TypeScript type is always PG-based for editor inference.
// At runtime, the actual client may be PG, Turso, or D1.
type DBType = ReturnType<typeof drizzlePg>;

let _db: DBType;
let _pool: Pool | null = null;

if (config.HAS_PG) {
  // ─── PostgreSQL ──────────────────────────────────────────────────────
  const { Pool: PgPool } = require("pg") as { Pool: typeof Pool };

  const globalForDb = globalThis as typeof globalThis & {
    __autologinPgPool?: Pool;
  };

  _pool =
    globalForDb.__autologinPgPool ??
    new PgPool({
      connectionString: config.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 5000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__autologinPgPool = _pool;
  }

  _db = drizzlePg(_pool, { schema });
} else if (config.HAS_TURSO) {
  // ─── Turso / libSQL ──────────────────────────────────────────────────
  const { createClient } = require("@libsql/client");

  const libsqlClient = createClient({
    url: config.TURSO_DATABASE_URL,
    authToken: config.TURSO_AUTH_TOKEN || undefined,
  });

  const globalForDb = globalThis as typeof globalThis & {
    __autologinTursoDb?: DBType;
  };

  if (globalForDb.__autologinTursoDb) {
    _db = globalForDb.__autologinTursoDb;
  } else {
    // drizzle-orm/libsql — typed as PG for inference, runtime is SQLite
    const { drizzle: drizzleTurso } = require("drizzle-orm/libsql");
    _db = drizzleTurso(libsqlClient, { schema }) as unknown as DBType;
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__autologinTursoDb = _db;
    }
  }
} else {
  // ─── Cloudflare D1 ───────────────────────────────────────────────────
  // The DB binding is injected by Wrangler at runtime in production.
  console.warn("[db] No DATABASE_URL — Cloudflare D1 mode (requires wrangler runtime binding)");
  _db = null as unknown as DBType;
}

export { _pool as pool };
export const db = _db;
export type DB = DBType;
