#!/usr/bin/env node
// AutoLogin Scheduler — idempotent local beta setup.
const readline = require("readline");
const fs = require("fs");
const crypto = require("crypto");
const { execSync } = require("child_process");

const isInteractive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
const rl = isInteractive
  ? readline.createInterface({ input: process.stdin, output: process.stdout })
  : null;

function ask(question, fallback) {
  if (!rl) return Promise.resolve(fallback);
  return new Promise((resolve) => {
    rl.question(`${question} (${fallback}): `, (answer) => {
      resolve(answer.trim() || fallback);
    });
  });
}

function upsertEnv(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) return content.replace(pattern, line);
  return `${content.trimEnd()}\n${line}\n`;
}

function run(command, label) {
  console.log(`\n→ ${label}`);
  execSync(command, { stdio: "inherit", timeout: 180000 });
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║       AutoLogin Scheduler — Beta Setup              ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  run("node --version && npm --version", "Checking Node.js and npm");

  const adminEmail = await ask("Admin email", "sudhi@gmal.com");
  const adminPassword = await ask("Admin password", "1Sudhi@gmal.com");

  let env = fs.existsSync(".env") ? fs.readFileSync(".env", "utf8") : "";
  const existingAuth = env.match(/^AUTH_SECRET=(.+)$/m)?.[1];
  const existingJwt = env.match(/^JWT_SECRET=(.+)$/m)?.[1];
  const authSecret = existingAuth || crypto.randomBytes(48).toString("hex");
  const jwtSecret = existingJwt || authSecret;

  env = upsertEnv(
    env,
    "DATABASE_URL",
    env.match(/^DATABASE_URL=(.+)$/m)?.[1] ||
      "postgresql://postgres:postgres@127.0.0.1:5432/app_db"
  );
  env = upsertEnv(env, "AUTH_SECRET", authSecret);
  env = upsertEnv(env, "JWT_SECRET", jwtSecret);
  env = upsertEnv(env, "ALLOW_REGISTRATION", "true");
  env = upsertEnv(env, "DEMO_MODE", "true");
  env = upsertEnv(env, "ADMIN_EMAIL", adminEmail);
  env = upsertEnv(env, "ADMIN_PASSWORD", adminPassword);
  env = upsertEnv(env, "ADMIN_NAME", "Sudhir Singh (Beta Admin)");
  fs.writeFileSync(".env", env);
  console.log("\n✓ .env configured (existing database URL and secrets preserved)");

  run("npx drizzle-kit push --force", "Applying PostgreSQL schema");
  run("npm run build", "Building the application");

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  Setup complete — beta workspace is ready           ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`\nLogin:    ${adminEmail}`);
  console.log(`Password: ${adminPassword}`);
  console.log("Start:    npm run dev");
  console.log("Open:     http://localhost:3000/login");
  console.log("\nFirst login automatically creates the fake beta workspace.\n");
  rl?.close();
}

main().catch((error) => {
  rl?.close();
  console.error("\nSetup failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
