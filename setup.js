#!/usr/bin/env node
/**
 * AutoLogin Scheduler — Interactive Setup Script
 * Supports: PostgreSQL | Turso/libSQL | Cloudflare D1
 */
const readline = require("readline");
const fs       = require("fs");
const crypto   = require("crypto");
const { execSync } = require("child_process");

const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const rl = isInteractive
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null;

function ask(question, fallback = "") {
  if (!rl) return Promise.resolve(fallback);
  return new Promise((resolve) => {
    rl.question(`${question}${fallback ? ` (${fallback})` : ""}: `, (answer) => {
      resolve(answer.trim() || fallback);
    });
  });
}

function upsertEnv(content, key, value) {
  if (!value) return content;
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  return pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
}

function run(cmd, label) {
  console.log(`\n→ ${label}`);
  execSync(cmd, { stdio: "inherit", timeout: 180_000 });
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   AutoLogin Scheduler — Setup (PostgreSQL/Turso/D1) ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ─── DB choice ────────────────────────────────────────────────────────
  console.log("Database options:");
  console.log("  1) PostgreSQL (local dev / Supabase / Railway / Neon)");
  console.log("  2) Turso / libSQL (free SQLite cloud)");
  console.log("  3) Cloudflare D1 (deploy only — skip for local dev)");
  const dbChoice = await ask("Choose (1/2/3)", "1");

  let envContent = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";

  if (dbChoice === "1") {
    const defaultPg = envContent.match(/^DATABASE_URL=(.+)$/m)?.[1] || "postgresql://postgres:postgres@127.0.0.1:5432/app_db";
    const pgUrl = await ask("PostgreSQL URL", defaultPg);
    envContent = upsertEnv(envContent, "DATABASE_URL", pgUrl);
  } else if (dbChoice === "2") {
    const tursoUrl = await ask("Turso DB URL (libsql://your-db.turso.io)", "");
    const tursoToken = await ask("Turso Auth Token", "");
    if (tursoUrl) envContent = upsertEnv(envContent, "TURSO_DATABASE_URL", tursoUrl);
    if (tursoToken) envContent = upsertEnv(envContent, "TURSO_AUTH_TOKEN", tursoToken);
    // Clear DATABASE_URL so Turso takes priority
    envContent = envContent.replace(/^DATABASE_URL=.*$/m, "# DATABASE_URL= (using Turso instead)");
  } else {
    console.log("→ Cloudflare D1 mode — DATABASE_URL not needed. Will push schema via wrangler.");
    envContent = upsertEnv(envContent, "DATABASE_URL", "");
  }

  // ─── Secrets ──────────────────────────────────────────────────────────
  const existingAuth = envContent.match(/^AUTH_SECRET=(.+)$/m)?.[1];
  const authSecret = existingAuth || crypto.randomBytes(48).toString("hex");
  envContent = upsertEnv(envContent, "AUTH_SECRET", authSecret);
  envContent = upsertEnv(envContent, "JWT_SECRET", authSecret);

  // ─── Admin ────────────────────────────────────────────────────────────
  const adminEmail = await ask("Admin email", "sudhi@gmal.com");
  const adminPass  = await ask("Admin password", "1Sudhi@gmal.com");
  envContent = upsertEnv(envContent, "ADMIN_EMAIL", adminEmail);
  envContent = upsertEnv(envContent, "ADMIN_PASSWORD", adminPass);
  envContent = upsertEnv(envContent, "FAKE_DATA", "true");
  envContent = upsertEnv(envContent, "ALLOW_REGISTRATION", "true");

  fs.writeFileSync(".env", envContent);
  console.log("\n✓ .env configured");

  // ─── Push schema ──────────────────────────────────────────────────────
  try {
    if (dbChoice === "1") {
      run("npx drizzle-kit push --force", "Pushing PostgreSQL schema");
    } else if (dbChoice === "2") {
      run("npx drizzle-kit push --config drizzle.turso.config.ts", "Pushing Turso/libSQL schema");
    } else {
      console.log("→ D1: run `npx wrangler d1 migrations apply DB --remote` after deploy.");
    }
  } catch (e) {
    console.warn("⚠ Schema push failed. Run manually if needed.");
  }

  // ─── Build ────────────────────────────────────────────────────────────
  run("npm run build", "Building application");

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Setup complete!                                     ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nLogin: ${adminEmail}`);
  console.log(`Pass:  ${adminPass}`);
  console.log("Start: npm run dev  →  http://localhost:3000");
  rl?.close();
}

main().catch((e) => {
  rl?.close();
  console.error("Setup error:", e instanceof Error ? e.message : e);
  process.exit(1);
});
