/**
 * ─── Central Configuration ──────────────────────────────────────────────
 * All env vars with sensible defaults. The app works even when .env only
 * has DATABASE_URL (platform-managed). Override any value in .env or via
 * Cloudflare Worker secrets.
 *
 * Supported databases:
 *   PostgreSQL    → DATABASE_URL=postgresql://...
 *   Turso (libSQL)→ DATABASE_URL=libsql://...  (or TURSO_DATABASE_URL + TURSO_AUTH_TOKEN)
 *   Cloudflare D1 → Leave DATABASE_URL empty (binding injected at runtime)
 *
 * For production: set AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD as secrets.
 */

function getEnv(key: string, fallback = ""): string {
  const val = process.env[key];
  if (val === undefined || val === null) return fallback;
  return val.trim();
}

// ─── Database Detection ──────────────────────────────────────────────────
const _rawDbUrl = getEnv("DATABASE_URL");
const _tursoUrl = getEnv("TURSO_DATABASE_URL");

const _tursoDbUrl =
  _rawDbUrl.startsWith("libsql://") || _rawDbUrl.startsWith("libsql:")
    ? _rawDbUrl
    : _tursoUrl;

const _isTurso = Boolean(_tursoDbUrl);
const _isPg = !_isTurso && Boolean(_rawDbUrl);

export const config = {
  // Database — auto-detect type from URL scheme
  DATABASE_URL: _rawDbUrl,
  DB_TYPE: _isTurso ? ("turso" as const) : _isPg ? ("postgresql" as const) : ("d1" as const),
  HAS_PG: _isPg,
  HAS_TURSO: _isTurso,
  HAS_D1: !_isTurso && !_isPg,

  // Turso / libSQL
  TURSO_DATABASE_URL: _tursoDbUrl,
  TURSO_AUTH_TOKEN: getEnv("TURSO_AUTH_TOKEN"),

  // Auth secrets — fallback ensures dev works without .env setup
  AUTH_SECRET:
    getEnv("AUTH_SECRET") ||
    getEnv("JWT_SECRET") ||
    "autologin-fallback-dev-secret-change-in-production-2026",

  // Separate encryption key for credentials (best practice: key separation).
  // Falls back to AUTH_SECRET-derived key if not set.
  ENCRYPTION_SECRET:
    getEnv("ENCRYPTION_SECRET") ||
    (getEnv("AUTH_SECRET") || getEnv("JWT_SECRET") || "autologin-fallback-dev-secret-change-in-production-2026") +
      ":encryption-key-derivation-v1",

  // Admin credentials — hardcoded defaults for instant login
  ADMIN_EMAIL: getEnv("ADMIN_EMAIL", "sudhi@gmal.com"),
  ADMIN_PASSWORD: getEnv("ADMIN_PASSWORD", "1Sudhi@gmal.com"),

  // Feature flags
  FAKE_DATA: process.env.FAKE_DATA !== "false", // default true
  ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION !== "false", // default true

  // Email providers (optional)
  RESEND_API_KEY: getEnv("RESEND_API_KEY"),
  RESEND_FROM: getEnv("RESEND_FROM"),
  BREVO_API_KEY: getEnv("BREVO_API_KEY"),
  BREVO_FROM: getEnv("BREVO_FROM"),
  SMTP_HOST: getEnv("SMTP_HOST"),
  SMTP_PORT: getEnv("SMTP_PORT", "587"),
  SMTP_USER: getEnv("SMTP_USER"),
  SMTP_PASS: getEnv("SMTP_PASS"),
  SMTP_FROM: getEnv("SMTP_FROM"),

  // S3 / R2 storage (optional)
  S3_ENDPOINT: getEnv("S3_ENDPOINT"),
  S3_ACCESS_KEY_ID: getEnv("S3_ACCESS_KEY_ID"),
  S3_SECRET_ACCESS_KEY: getEnv("S3_SECRET_ACCESS_KEY"),
  S3_BUCKET_NAME: getEnv("S3_BUCKET_NAME", "autologin-screenshots"),
  S3_REGION: getEnv("S3_REGION", "us-east-1"),

  // Derived helpers
  HAS_EMAIL:
    Boolean(getEnv("RESEND_API_KEY")) ||
    Boolean(getEnv("BREVO_API_KEY")) ||
    Boolean(getEnv("SMTP_HOST")),
  HAS_STORAGE:
    Boolean(getEnv("S3_ENDPOINT")) && Boolean(getEnv("S3_BUCKET_NAME")),
} as const;

export function isAdminEmail(email: string): boolean {
  return email.toLowerCase() === config.ADMIN_EMAIL.toLowerCase();
}
