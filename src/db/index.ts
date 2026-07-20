/**
 * ─── Database Adapter (Auto-detect) ────────────────────────────────────
 *
 * Priority order (first match wins):
 *   1. Turso / libSQL  — TURSO_DATABASE_URL or DATABASE_URL starting with libsql://
 *   2. PostgreSQL      — DATABASE_URL starting with postgresql:// or postgres://
 *   3. Cloudflare D1   — no DATABASE_URL (runtime DB binding injected by Worker)
 *
 * The exported `db` has identical query API regardless of backend.
 * Only `schema.ts` (pg-core) or `schema.sqlite.ts` (sqlite-core) differ.
 */

// ─── PostgreSQL imports ────────────────────────────────────────────────────
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool }                  from "pg";
import * as pgSchema             from "./schema";

// ─── libSQL / Turso imports ────────────────────────────────────────────────
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient }              from "@libsql/client";
import * as sqliteSchema             from "./schema.sqlite";

// ─── Detect DB mode ───────────────────────────────────────────────────────
const RAW_URL          = process.env.DATABASE_URL          ?? "";
const TURSO_URL        = process.env.TURSO_DATABASE_URL    ?? "";
const TURSO_TOKEN      = process.env.TURSO_AUTH_TOKEN      ?? "";

const IS_TURSO =
  Boolean(TURSO_URL) ||
  RAW_URL.startsWith("libsql://") ||
  RAW_URL.startsWith("libsql+http://") ||
  RAW_URL.startsWith("libsql+https://");

const IS_PG =
  !IS_TURSO &&
  (RAW_URL.startsWith("postgresql://") ||
    RAW_URL.startsWith("postgres://"));

const IS_D1 = !IS_TURSO && !IS_PG;

// Export mode for api/version and config
export const DB_MODE: "pg" | "turso" | "d1" =
  IS_TURSO ? "turso" : IS_PG ? "pg" : "d1";

// ─── Build client ─────────────────────────────────────────────────────────
let _db: any;
let _pool: Pool | null = null;

if (IS_TURSO) {
  // ── Turso / libSQL ────────────────────────────────────────────────────
  const url   = TURSO_URL || RAW_URL;
  const token = TURSO_TOKEN;

  const globalForTurso = globalThis as typeof globalThis & {
    __autologinLibsqlClient?: ReturnType<typeof createClient>;
  };

  const client =
    globalForTurso.__autologinLibsqlClient ??
    createClient({
      url,
      ...(token ? { authToken: token } : {}),
    });

  if (process.env.NODE_ENV !== "production") {
    globalForTurso.__autologinLibsqlClient = client;
  }

  _db = drizzleLibsql(client, { schema: sqliteSchema });
  console.info("[db] Turso/libSQL mode →", url.replace(/\/\/.*@/, "//<token>@"));

} else if (IS_PG) {
  // ── PostgreSQL ────────────────────────────────────────────────────────
  const globalForPg = globalThis as typeof globalThis & {
    __autologinPgPool?: Pool;
  };

  _pool =
    globalForPg.__autologinPgPool ??
    new Pool({
      connectionString: RAW_URL,
      max: 10,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPg.__autologinPgPool = _pool;
  }

  _db = drizzlePg(_pool, { schema: pgSchema });
  console.info("[db] PostgreSQL mode");

} else {
  // ── Cloudflare D1 (no DATABASE_URL) ──────────────────────────────────
  // The real DB binding is injected at runtime by the Worker.
  // This stub lets Next.js compile without errors.
  console.info("[db] D1 / Cloudflare Worker mode (binding injected at runtime)");
  _db = null;
}

export { _pool as pool };
export const db = _db;
export { pgSchema, sqliteSchema };

export type PgDB     = ReturnType<typeof drizzlePg<typeof pgSchema>>;
export type LibsqlDB = ReturnType<typeof drizzleLibsql<typeof sqliteSchema>>;
export type DB       = PgDB | LibsqlDB;
