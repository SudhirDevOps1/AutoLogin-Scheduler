# 🔐 AutoLogin Scheduler — v1.0.0

> **Self-hosted, privacy-first, serverless auto-login scheduler.**
> Deploy on Cloudflare Workers + D1 (free tier) or your own PostgreSQL.
> Built by **Sudhir Singh** ([@SudhirDevOps1](https://github.com/SudhirDevOps1)).

![Logo](public/logo.png)

![License: MIT](https://img.shields.io/badge/license-MIT-violet)
![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-orange)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-blue)

---

## 🌐 Live Preview

**→ [Open App](#)** — Login: `sudhi@gmal.com` / `1Sudhi@gmal.com`

---

## 📑 Table of Contents

| # | Section |
|---|---------|
| 1 | [Quick Start](#-quick-start) |
| 2 | [FAKE_DATA Toggle](#-fakedata-toggle-production-vs-demo) |
| 3 | [Database: PostgreSQL vs D1](#-database-postgresql-vs-cloudflare-d1) |
| 4 | [Features](#-features) |
| 5 | [Security](#-security-anti-hacking) |
| 6 | [API Reference](#-api-reference-16-endpoints) |
| 7 | [File Structure & Editing Guide](#-file-structure--editing-guide) |
| 8 | [Deploy to Cloudflare](#-deploy-to-cloudflare-workers) |
| 9 | [Environment Variables](#-environment-variables) |
| 10 | [Troubleshooting](#-troubleshooting) |

---

## 🚀 Quick Start

```bash
git clone https://github.com/SudhirDevOps1/AutoLogin-Scheduler.git
cd AutoLogin-Scheduler
npm install
npm run setup        # Auto-configures .env + pushes DB schema + builds
npm run dev          # → http://localhost:3000
```

**Login instantly:**
| Email | Password |
|-------|----------|
| `sudhi@gmal.com` | `1Sudhi@gmal.com` |

---

## 🎭 FAKE_DATA Toggle (Production vs Demo)

```env
# .env file
FAKE_DATA=true    # Demo mode — auto-seeds 6 fake credentials, 6 schedules, 42 logs
FAKE_DATA=false   # Production — zero fake data, no demo endpoints, pure app
```

| Behavior | `FAKE_DATA=true` | `FAKE_DATA=false` |
|----------|:-:|:-:|
| Auto-seed demo data on login/register | ✅ | ❌ |
| `/api/demo` seed/reset endpoints | ✅ Active | ❌ 404 |
| Demo Lab in Settings | ✅ Visible | ❌ Hidden |
| Beta badge in sidebar | ✅ Visible | ❌ Hidden |
| All real features (CRUD, auth, security) | ✅ | ✅ |

**To go production:** Edit `.env` → `FAKE_DATA=false` → `npm run dev`

---

## 🗄 Database Options — PostgreSQL / Turso / D1

The app **auto-detects** which database to use. Priority order (first match wins):

| Priority | Database | Trigger | Free tier |
|----------|----------|---------|-----------|
| **1st** | **Turso / libSQL** | `TURSO_DATABASE_URL=libsql://...` OR `DATABASE_URL=libsql://...` | ✅ 500MB free |
| **2nd** | **PostgreSQL** | `DATABASE_URL=postgresql://...` | Your server |
| **3rd** | **Cloudflare D1** | `DATABASE_URL` empty | ✅ 5GB free |

### Turso / libSQL Setup (Free SQLite Cloud)

```env
# Option A — dedicated variable (recommended)
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token

# Option B — use DATABASE_URL directly
DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token
```

Push schema to Turso:
```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... \
  npx drizzle-kit push --config drizzle.turso.config.ts
# or use the npm script:
npm run db:push:turso
```

### PostgreSQL Setup

```env
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```
Push schema: `npm run db:push`

### Cloudflare D1 Setup

```env
# DATABASE_URL = (leave empty)
```
Push schema: `npm run db:push:d1`

The detection logic is in `src/db/index.ts` and `src/lib/config.ts`.

---

## ✨ Features

### Authentication
- ✅ Register with **MX DNS email validation** (Cloudflare DoH)
- ✅ Login with **rate limiting** (20/15min per IP, 10/15min per email)
- ✅ **Account lockout** (5 failures → 15-min lock)
- ✅ **PBKDF2** password hashing (210,000 iterations, SHA-512)
- ✅ **JWT HS256** sessions with revocation table
- ✅ **Admin login** via env vars (bypasses DB for first access)

### Credentials
- ✅ CRUD with **AES-256-GCM** encryption
- ✅ Passwords never leave the server (encrypted in DB, stripped from API)
- ✅ Manual trigger (test login simulation)
- ✅ Status tracking (active / paused / failed)

### Schedules
- ✅ Natural language: `every 30 minutes`, `every 1 day`
- ✅ 5-field cron: `0 */6 * * *`
- ✅ Toggle enabled/disabled
- ✅ Alert settings (on failure / on success)
- ✅ Optional screenshot capture (R2/S3)

### Logs & Admin
- ✅ Paginated login history (filter by success/failure)
- ✅ Detail modal with duration, error, screenshot info
- ✅ Admin panel: system stats, users, audit trail, service status

---

## 🛡 Security (Anti-Hacking)

| Layer | Protection |
|-------|-----------|
| **SQL Injection** | Drizzle ORM parameterized queries — no raw SQL |
| **Password Storage** | PBKDF2 210k iterations + SHA-512 + 128-bit salt |
| **Timing Attack** | `crypto.timingSafeEqual` for all comparisons |
| **Credential at Rest** | AES-256-GCM authenticated encryption |
| **Session** | JWT HS256 + `sessions` revocation table + 7-day expiry |
| **Rate Limiting** | DB-backed sliding window (no in-memory bypass) |
| **Account Lockout** | 5 failures → 15-minute lock (auto-clears) |
| **Bot Detection** | 30+ regex patterns (SQLi, XSS, path traversal, RCE) |
| **Email Validation** | MX DNS lookup + 30+ disposable domain blocklist |
| **Input Sanitization** | All inputs checked for malicious patterns |
| **Audit Log** | Every sensitive action logged with IP hash + timestamp |
| **Tenant Isolation** | Every query scoped by `userId` — no cross-user access |

---

## 📡 API Reference (16 endpoints)

### Auth
| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/api/auth/register` | ❌ | Create account |
| `POST` | `/api/auth/login` | ❌ | Login (admin env bypass) |
| `POST` | `/api/auth/logout` | ✅ | Revoke session |
| `GET` | `/api/auth/me` | ✅ | Current user + stats |
| `GET` | `/api/auth/check-email?email=x` | ❌ | MX DNS validation |

### Credentials
| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/api/credentials` | ✅ | List (encrypted passwords stripped) |
| `POST` | `/api/credentials` | ✅ | Create (AES-GCM encrypted) |
| `PUT` | `/api/credentials?id=x` | ✅ | Update |
| `DELETE` | `/api/credentials?id=x` | ✅ | Delete (cascade) |

### Schedules
| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/api/schedules` | ✅ | List |
| `POST` | `/api/schedules` | ✅ | Create |
| `PUT` | `/api/schedules?id=x` | ✅ | Update |
| `DELETE` | `/api/schedules?id=x` | ✅ | Delete |

### System
| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `GET` | `/api/health` | ❌ | Health check |
| `GET` | `/api/version` | ❌ | Version + service status |
| `GET` | `/api/admin/overview` | Admin | System dashboard |
| `POST` | `/api/demo` | ✅ | Seed/reset demo workspace |
| `POST` | `/api/trigger` | ✅ | Manual login run |
| `GET` | `/api/logs` | ✅ | Login history |

---

## 📁 File Structure & Editing Guide

| What to edit | File | Details |
|--------------|------|---------|
| **App name** | `package.json`, `src/app/layout.tsx` | metadata.title |
| **Colors / theme** | `src/app/globals.css` | `@theme` block — purple/pink gradient |
| **Admin login** | `.env` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| **Logo PNG** | `public/logo.png` | Shield + clock (753KB PNG) |
| **Logo SVG** | `public/logo.svg` | Scalable vector, crisp at any size |
| **Favicon SVG** | `public/favicon.svg` | Browser tab icon (64px) |
| **Demo data content** | `src/lib/demo-data.ts` | The 6 fake credentials array |
| **FAKE_DATA / feature flags** | `src/lib/config.ts` | Central config with defaults |
| **PBKDF2 iterations** | `src/lib/security.ts` | `PBKDF2_ITERATIONS` (210000) |
| **AES encryption key** | `src/lib/security.ts` | `getEncryptionKey()` |
| **Rate limits** | `src/lib/auth.ts` | `checkRateLimit()` calls |
| **Email validation** | `src/lib/email-validation.ts` | Disposable domains, DoH |
| **PG schema** | `src/db/schema.ts` | 7 tables — Drizzle pg-core |
| **SQLite schema** | `src/db/schema.sqlite.ts` | Same tables — Drizzle sqlite-core |
| **DB connection** | `src/db/index.ts` | PG pool / Turso libSQL / D1 detection |
| **Drizzle PG config** | `drizzle.config.json` | `npm run db:push` |
| **Drizzle Turso config** | `drizzle.turso.config.ts` | `npm run db:push:turso` |
| **Drizzle D1 config** | `drizzle.d1.config.ts` | `npm run db:push:d1` |
| **Landing page** | `src/app/page.tsx` | Hero, features, architecture |
| **Login page** | `src/app/login/page.tsx` | Pre-filled demo creds |
| **Register page** | `src/app/register/page.tsx` | MX validation UI |
| **Dashboard** | `src/app/dashboard/page.tsx` | Overview stats |
| **Credentials UI** | `src/app/dashboard/credentials/page.tsx` | CRUD + trigger |
| **Schedules UI** | `src/app/dashboard/schedules/page.tsx` | Cron presets |
| **Logs UI** | `src/app/dashboard/logs/page.tsx` | History + filter |
| **Settings UI** | `src/app/dashboard/settings/page.tsx` | Config + demo lab |
| **Admin panel** | `src/app/dashboard/admin/page.tsx` | System stats |
| **Cloudflare Worker** | `src/worker/index.ts` | Hono app (D1) |
| **Wrangler config** | `wrangler.toml` | D1 + Cron + Browser |
| **Setup script** | `setup.js` | Interactive CLI |
| **All env defaults** | `src/lib/config.ts` | Central config |

---

## ☁️ Deploy to Cloudflare Workers

### One-Click
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/SudhirDevOps1/AutoLogin-Scheduler)

### CLI
```bash
npx wrangler login
npx wrangler d1 create autologin-db
# Copy database_id → wrangler.toml
npx wrangler secret put AUTH_SECRET
npm run build
npm run deploy
```

---

## ⚙️ Environment Variables

| Variable | Default | Required | Description |
|----------|---------|:--------:|-------------|
| `DATABASE_URL` | — | PG only | `postgresql://...` OR `libsql://...` (empty = D1) |
| `TURSO_DATABASE_URL` | — | Turso only | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | — | Turso only | Turso authentication token |
| `AUTH_SECRET` | built-in fallback | ⚠️ Prod | JWT + AES-256 encryption key |
| `FAKE_DATA` | `true` | No | `false` = production, `true` = demo mode |
| `ALLOW_REGISTRATION` | `true` | No | `false` = owner-only mode |
| `ADMIN_EMAIL` | `sudhi@gmal.com` | No | Admin login email |
| `ADMIN_PASSWORD` | `1Sudhi@gmal.com` | No | Admin login password |
| `RESEND_API_KEY` | — | No | Email alerts (Resend, 100/day) |
| `BREVO_API_KEY` | — | No | Email alerts (Brevo, 300/day) |
| `SMTP_HOST` | — | No | Email alerts (any SMTP) |
| `S3_ENDPOINT` | — | No | Screenshot storage endpoint |
| `S3_BUCKET_NAME` | `autologin-screenshots` | No | S3/R2 bucket name |

> ⚠️ **Production:** Set `AUTH_SECRET` via `wrangler secret put`. The built-in fallback is for dev only.

---

## 🔧 Troubleshooting

| Problem | Solution |
|---------|----------|
| Login "Internal server error" | Ensure `AUTH_SECRET` is set (or use fallback) |
| Admin login fails | Check `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` |
| "Email domain does not exist" | MX DNS check blocked invalid domain — use real email |
| "Schedule already exists" | Each credential has max 1 schedule. Use PUT to update |
| Can't access admin panel | Only `ADMIN_EMAIL` user sees the admin link |
| Reset all data | Dashboard → Settings → Demo Lab → Reset |

---

## 📜 License

**MIT** — Free to self-host, modify, redistribute. Credit **Sudhir Singh**.

**GitHub:** [SudhirDevOps1/AutoLogin-Scheduler](https://github.com/SudhirDevOps1/AutoLogin-Scheduler)
