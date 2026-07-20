/**
 * ─── Central Configuration ──────────────────────────────────────────────
 * All env vars with sensible defaults.
 * The app works even when .env only has DATABASE_URL (platform-managed).
 * Override any value in .env or via Cloudflare Worker / Turso secrets.
 *
 * Database priority (first match wins):
 *   1. Turso/libSQL  → TURSO_DATABASE_URL  OR  DATABASE_URL=libsql://...
 *   2. PostgreSQL    → DATABASE_URL=postgresql://...
 *   3. Cloudflare D1 → DATABASE_URL empty  (runtime Worker binding)
 *
 * To disable demo data and run production:
 *   FAKE_DATA=false
 */

function getEnv(key: string, fallback = ""): string {
  const val = process.env[key];
  if (val === undefined || val === null) return fallback;
  return val.trim();
}

// ─── Raw values ───────────────────────────────────────────────────────────
const _DATABASE_URL   = getEnv("DATABASE_URL");
const _TURSO_URL      = getEnv("TURSO_DATABASE_URL");
const _IS_TURSO       = Boolean(_TURSO_URL) || _DATABASE_URL.startsWith("libsql");
const _IS_PG          = !_IS_TURSO && (_DATABASE_URL.startsWith("postgresql") || _DATABASE_URL.startsWith("postgres://"));

export const config = {
  // ─── Database ────────────────────────────────────────────────────────
  // PostgreSQL: set DATABASE_URL=postgresql://...
  // Turso:      set TURSO_DATABASE_URL=libsql://... (+ TURSO_AUTH_TOKEN)
  //             OR  DATABASE_URL=libsql://...
  // D1:         leave DATABASE_URL empty (Cloudflare Workers only)
  DATABASE_URL:      _DATABASE_URL,
  TURSO_DATABASE_URL: _TURSO_URL,
  TURSO_AUTH_TOKEN:  getEnv("TURSO_AUTH_TOKEN"),

  HAS_PG:    _IS_PG,
  HAS_TURSO: _IS_TURSO,
  HAS_D1:    !_IS_PG && !_IS_TURSO,

  // Human-readable db name for /api/version
  DB_LABEL: _IS_TURSO ? "turso-libsql" : _IS_PG ? "postgresql" : "cloudflare-d1",

  // ─── Auth secrets ────────────────────────────────────────────────────
  // Generate production key: openssl rand -hex 32
  // Built-in fallback so the app never crashes during dev.
  AUTH_SECRET:
    getEnv("AUTH_SECRET") ||
    getEnv("JWT_SECRET") ||
    "autologin-fallback-dev-secret-change-in-production-2026",

  // ─── Admin account ───────────────────────────────────────────────────
  // Bypasses DB on first login so you can always get in.
  // Change in .env for production (or via wrangler secret put).
  ADMIN_EMAIL:    getEnv("ADMIN_EMAIL", "sudhi@gmal.com"),
  ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD", "1Sudhi@gmal.com"),

  // ─── Feature flags ───────────────────────────────────────────────────
  FAKE_DATA:          process.env.FAKE_DATA !== "false",   // default: true
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION !== "false", // default: true

  // ─── Email providers (optional — pick one) ───────────────────────────
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  RESEND_FROM:    getEnv("RESEND_FROM"),
  BREVO_API_KEY:  getEnv("BREVO_API_KEY"),
  BREVO_FROM:     getEnv("BREVO_FROM"),
  SMTP_HOST:      getEnv("SMTP_HOST"),
  SMTP_PORT:      getEnv("SMTP_PORT", "587"),
  SMTP_USER:      getEnv("SMTP_USER"),
  SMTP_PASS:      getEnv("SMTP_PASS"),
  SMTP_FROM:      getEnv("SMTP_FROM"),

  // ─── S3 / R2 / Backblaze storage (optional) ─────────────────────────
  S3_ENDPOINT:          getEnv("S3_ENDPOINT"),
  S3_ACCESS_KEY_ID:     getEnv("S3_ACCESS_KEY_ID"),
  S3_SECRET_ACCESS_KEY: getEnv("S3_SECRET_ACCESS_KEY"),
  S3_BUCKET_NAME:       getEnv("S3_BUCKET_NAME", "autologin-screenshots"),
  S3_REGION:            getEnv("S3_REGION", "us-east-1"),

  // ─── Derived ─────────────────────────────────────────────────────────
  HAS_EMAIL:
    Boolean(getEnv("RESEND_API_KEY")) ||
    Boolean(getEnv("BREVO_API_KEY"))  ||
    Boolean(getEnv("SMTP_HOST")),
  HAS_STORAGE:
    Boolean(getEnv("S3_ENDPOINT")) && Boolean(getEnv("S3_BUCKET_NAME")),
} as const;

/** True if the given email matches the configured admin email. */
export function isAdminEmail(email: string): boolean {
  return email.toLowerCase().trim() === config.ADMIN_EMAIL.toLowerCase().trim();
}
