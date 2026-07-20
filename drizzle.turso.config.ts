/**
 * Drizzle Kit config for Turso / libSQL.
 *
 * Usage:
 *   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
 *   npx drizzle-kit push --config drizzle.turso.config.ts
 *
 * Or add to package.json scripts:
 *   "db:push:turso": "drizzle-kit push --config drizzle.turso.config.ts"
 */
import { defineConfig } from "drizzle-kit";

const url   = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
const token = process.env.TURSO_AUTH_TOKEN   ?? "";

if (!url) {
  throw new Error(
    "Set TURSO_DATABASE_URL (or DATABASE_URL=libsql://...) before running drizzle-kit for Turso."
  );
}

export default defineConfig({
  dialect: "turso",
  schema: "./src/db/schema.sqlite.ts",
  dbCredentials: {
    url,
    ...(token ? { authToken: token } : {}),
  },
});
