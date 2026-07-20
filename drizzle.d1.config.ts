/**
 * Drizzle Kit config for Cloudflare D1 (sqlite-core dialect).
 *
 * Usage:
 *   npx wrangler d1 migrations apply DB --remote
 *   OR
 *   npx drizzle-kit push --config drizzle.d1.config.ts
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.sqlite.ts",
  dbCredentials: {
    url: ":memory:", // D1 binding handles the actual connection
  },
});
