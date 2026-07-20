# 🔐 AutoLogin Scheduler

> **Self-hosted, privacy-first, serverless auto-login scheduler.**
> Runs on **Cloudflare Workers + D1** (free) or your own **PostgreSQL** / **Turso** database.
> Built by **Sudhir Singh** — [@SudhirDevOps1](https://github.com/SudhirDevOps1)

<p align="center">
  <img src="public/logo.png" width="180" alt="AutoLogin Scheduler Logo"/>
</p>

<p align="center">
  <a href="https://github.com/SudhirDevOps1/AutoLogin-Scheduler/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-violet?style=flat-square" alt="MIT License"/></a>
  <a href="https://github.com/SudhirDevOps1/AutoLogin-Scheduler/releases"><img src="https://img.shields.io/badge/version-1.2.0-blue?style=flat-square" alt="v1.2.0"/></a>
  <a href="https://nextjs.org"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square" alt="Next.js 16"/></a>
  <a href="https://workers.cloudflare.com"><img src="https://img.shields.io/badge/Cloudflare-Workers%20%2B%20D1-orange?style=flat-square" alt="Cloudflare"/></a>
  <a href="https://orm.drizzle.team"><img src="https://img.shields.io/badge/Drizzle-ORM-blue?style=flat-square" alt="Drizzle"/></a>
  <img src="https://img.shields.io/badge/Status-Fully%20Working-success?style=flat-square" alt="Status"/>
</p>

<p align="center">
  <b>🌐 Live Demo:</b> Login with <code>sudhi@gmal.com</code> / <code>1Sudhi@gmal.com</code>
  <br/>
  <b>📚 Docs:</b> <a href="#-quick-start">Quick Start</a> · <a href="#-features">Features</a> · <a href="#-security">Security</a> · <a href="#-deploy-to-cloudflare">Deploy</a>
</p>

<p align="center">
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/SudhirDevOps1/AutoLogin-Scheduler">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare Workers"/>
  </a>
</p>

---

## 📑 Table of Contents

1. [Quick Start](#-quick-start)
2. [Features](#-features)
3. [Multi-Database Support](#-multi-database-support)
4. [FAKE_DATA Toggle](#-fakedata-toggle-demo-vs-production)
5. [Security](#-security)
6. [Known Limitations](#-known-limitations)
7. [API Reference](#-api-reference)
8. [Deploy to Cloudflare](#-deploy-to-cloudflare)
9. [Environment Variables](#-environment-variables)
10. [File Structure & Editing Guide](#-file-structure--editing-guide)
11. [Contributing](#-contributing)
12. [License](#-license)

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/SudhirDevOps1/AutoLogin-Scheduler.git
cd AutoLogin-Scheduler

# 2. Install
npm install

# 3. Configure (copy example, then edit .env)
cp .env.example .env

# 4. Push schema
npx drizzle-kit push --force

# 5. Start
npm run dev
# → Open http://localhost:3000/login
```

**Default admin login** (works out of the box):
| Email | Password |
|-------|----------|
| `sudhi@gmal.com` | `1Sudhi@gmal.com` |

> ⚠️ **Change these in `.env` before deploying to production!** See [Security](#-security).

---

## ✨ Features

### 🔐 Authentication
- ✅ Register + Login with **PBKDF2** (210,000 iterations, SHA-512)
- ✅ **JWT HS256** sessions with 7-day expiry + revocation table
- ✅ **Rate limiting** — DB-backed sliding window (5/hr signup, 20/15min login)
- ✅ **Account lockout** — 5 failures → 15-min lock (auto-clears)
- ✅ **Admin bypass** via env vars (instant access, no DB needed)
- ✅ **MX DNS email validation** via Cloudflare DoH + 30+ disposable blocklist

### 🗝️ Credentials
- ✅ CRUD with **AES-256-GCM** encryption
- ✅ **Separate encryption key** (`ENCRYPTION_SECRET`) from JWT signing key (`AUTH_SECRET`) — best practice **key separation**
- ✅ Passwords never leave the server (stripped from API responses)
- ✅ Manual trigger (test login button)
- ✅ Status tracking: `active` / `paused` / `failed`

### ⏰ Schedules & Launchpad
- ✅ Natural language: `every 30 minutes`, `every 6 hours`, `every 1 day`
- ✅ 5-field cron: `0 */6 * * *`
- ✅ **Multiple schedules per credential** — different times/frequencies for the same site
- ✅ **Auto mode** (Puppeteer headless) or **Manual Launchpad mode** per schedule
- ✅ Toggle enabled/disabled per schedule
- ✅ Per-schedule alert settings (on failure / on success)
- ✅ Optional screenshot capture (R2/S3 or DB fallback)

### 🚀 Launchpad (Manual Intervention Mode)
- ✅ When `executionMode: "manual"`, cron sends a rich SMTP/Resend email alert containing a secure **One-Click Quick Login Link**
- ✅ `/dashboard/launchpad?id=xxx&action=login` — auto-decrypts password on load and sets up a **One-Click copy helper**
- ✅ **Split-Screen Iframe Companion:** Target website loads directly inside the app in an embedded secure workspace next to credentials
- ✅ One-click copy controls for username and decrypted password in the left sidebar
- ✅ Quick external tab fallback link if target site blocks iframe embedding
- ✅ Record success/failure logs directly inside the companion page
- ✅ Works alongside auto-login schedules

### 📊 Logs & Admin
- ✅ Paginated login history with filter (success/failure/all)
- ✅ Detail modal: duration, error message, screenshot info
- ✅ **Admin panel** — system stats, users, active sessions, audit trail
- ✅ **Service status** — DB, auth, email, storage, browser rendering

### ☁️ Cloudflare Native
- ✅ **D1 SQLite** (5GB free) — no PostgreSQL needed
- ✅ **Cron Triggers** — checks due schedules every 6 hours
- ✅ **Browser Rendering** — Cloudflare Puppeteer on the edge
- ✅ **One-click deploy** button (see above)
- ✅ **R2/S3 optional** — screenshots stored anywhere or nowhere

### 🔗 Settings Quick Links Panel *(v1.2.0)*
- ✅ **12 clickable service cards** — Resend, Brevo, Gmail, Cloudflare D1/R2/Workers, Backblaze B2, Turso, GitHub, JWT Generator, Wrangler Docs
- ✅ **Inline API key badges** — next to Resend/Brevo/SMTP forms for instant navigation
- ✅ **JWT Secret via [Surakshit Vault Pro](https://surakshit-vault-pro.pages.dev/#jwt)**

### 📧 Dynamic Email Alert Routing & Socket SMTP *(v1.2.0)*
- ✅ **Custom Email Notification Address:** Optionally route all scheduler alerts (success/failure/manual prompts) to a distinct target email address (configured in settings) instead of the account profile.
- ✅ **Workers Sockets SMTP:** SMTP connection on Cloudflare Workers falls back to `worker-mailer` to establish native TCP streams (on port `465` with SSL/TLS) straight to the mail server (like `smtp.gmail.com`).

### 🛡️ Launchpad Smart Fallback *(v1.2.0)*
- ✅ **Auto-detects blocked iframes** — 4-second timeout with graceful fallback UI
- ✅ **Auto-Launch button** — opens site in new tab + auto-copies password to clipboard in one click
- ✅ **Works with any site** including mega.nz, Gmail, banking sites that block embedding

---

## 🗄 Multi-Database Support

The app **auto-detects** which database to use from `DATABASE_URL` — zero code changes:

| Database | URL Scheme | Config |
|----------|-----------|--------|
| **PostgreSQL** | `postgresql://...` | `DATABASE_URL=postgresql://...` |
| **Turso (libSQL)** | `libsql://...` | `DATABASE_URL=libsql://...` + `TURSO_AUTH_TOKEN=...` |
| **Cloudflare D1** | *(empty)* | `DATABASE_URL=` (binding injected at runtime) |

### Turso Setup (Serverless SQLite — 9GB free)
```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create autologin-db

# Get URL + token
turso db show autologin-db --url
turso db tokens create autologin-db

# Set in .env
DATABASE_URL=libsql://autologin-db-xxx.turso.io
TURSO_AUTH_TOKEN=eyJxxx...

# Push schema
npx drizzle-kit push --force
```

**All SQL queries use cross-DB syntax:** `CAST(count(*) AS INTEGER)`, `sum(CASE WHEN x THEN 1 ELSE 0 END)` — works identically on PG, Turso, D1.

---

## 🎭 FAKE_DATA Toggle (Demo vs Production)

Control demo data with a single env var:

```env
FAKE_DATA=true    # ← Auto-seeds 6 fake credentials, 6 schedules, 42 logs
FAKE_DATA=false   # ← Zero demo data, no demo endpoints, pure production
```

| Behavior | `FAKE_DATA=true` | `FAKE_DATA=false` |
|----------|:-:|:-:|
| Auto-seed on login/register | ✅ | ❌ |
| `/api/demo` endpoints | ✅ Active | ❌ 404 |
| Demo Lab in Settings | ✅ Visible | ❌ Hidden |
| Beta badge in sidebar | ✅ Visible | ❌ Hidden |
| Real CRUD, auth, security | ✅ Always | ✅ Always |

---

## 🛡 Security

Defense-in-depth security architecture:

| Layer | Protection |
|-------|-----------|
| **SQL Injection** | Drizzle ORM parameterized queries — no raw SQL |
| **Password Storage** | PBKDF2 210k iterations + SHA-512 + 128-bit salt |
| **Timing Attack** | `crypto.timingSafeEqual` for all comparisons |
| **Credentials at Rest** | AES-256-GCM with **separate `ENCRYPTION_SECRET`** (key separation) |
| **Session** | JWT HS256 + `sessions` revocation table + 7-day expiry |
| **Rate Limiting** | DB-backed sliding window (survives restarts) |
| **Account Lockout** | 5 failures → 15-min lock (auto-clears) |
| **Bot Detection** | 30+ regex patterns (SQLi, XSS, path traversal, RCE) |
| **Email Validation** | MX DNS lookup + 30+ disposable domain blocklist |
| **Tenant Isolation** | Every query scoped by `userId` — no cross-user access |
| **Audit Log** | Every action logged with IP hash + timestamp |
| **Key Separation** | `AUTH_SECRET` for JWT, `ENCRYPTION_SECRET` for AES-GCM |

### 🚨 Before Production

```env
# 1. Generate unique secrets
AUTH_SECRET=$(openssl rand -hex 32)
ENCRYPTION_SECRET=$(openssl rand -hex 32)   # ← Different from AUTH_SECRET
JWT_SECRET=$(openssl rand -hex 32)

# 2. Change default admin
ADMIN_EMAIL=your-real-admin@yourdomain.com
ADMIN_PASSWORD=<strong-random-password>

# 3. Disable demo mode
FAKE_DATA=false

# 4. (Optional) Owner-only mode
ALLOW_REGISTRATION=false
```

Full guide: [SECURITY.md](SECURITY.md)

---

## ⚠️ Known Limitations

| Limitation | Impact | Workaround |
|-----------|--------|------------|
| **CAPTCHA sites** | Cloudflare Puppeteer cannot solve CAPTCHAs | Use sites without CAPTCHA, or use trusted IP ranges |
| **2FA (TOTP/SMS)** | Can't handle two-factor auth prompts | Disable 2FA on target site, or use app-specific passwords |
| **Cloudflare Browser quota** | Free tier: limited browser rendering time | Upgrade to paid plan for heavy usage |
| **Screenshot storage** | Requires R2/S3 for binary storage | App still works without R2 — falls back to DB reference paths |

Auto-login works reliably for **any site without CAPTCHA or 2FA**.

---

## 📡 API Reference

### Auth (5 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login (env admin bypass) |
| `POST` | `/api/auth/logout` | Revoke session |
| `GET` | `/api/auth/me` | Current user + stats |
| `GET` | `/api/auth/check-email` | MX DNS validation |

### Credentials (4 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/credentials` | List (encrypted passwords stripped) |
| `POST` | `/api/credentials` | Create (AES-GCM encrypted) |
| `PUT` | `/api/credentials?id=x` | Update |
| `DELETE` | `/api/credentials?id=x` | Delete (cascade) |

### Schedules (4 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/schedules` | List all (multiple per credential allowed) |
| `POST` | `/api/schedules` | Create |
| `PUT` | `/api/schedules?id=x` | Update |
| `DELETE` | `/api/schedules?id=x` | Delete |

### Launchpad & Manual (3 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/credentials/reveal?id=x` | Decrypt password (audit-logged) |
| `POST` | `/api/logs/manual` | Record manual login success/failure |

### System (7 endpoints)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/version` | Version + DB type + service status |
| `GET` | `/api/admin/overview` | Admin dashboard (env-admin only) |
| `POST` | `/api/demo` | Seed/reset demo workspace |
| `POST` | `/api/trigger` | Manual login run |
| `PUT` | `/api/trigger` | Cron webhook (signed) |
| `GET` | `/api/logs` | Login history with filter/pagination |

Full details: [ADMIN_GUIDE.md](ADMIN_GUIDE.md)

---

## ☁️ Deploy to Cloudflare

### One-Click Deploy
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/SudhirDevOps1/AutoLogin-Scheduler)

### Manual Deploy (CLI)
```bash
# 1. Install Wrangler v4
npm install -g wrangler@4

# 2. Login to Cloudflare
wrangler login

# 3. Create D1 database
#    → Go to: https://dash.cloudflare.com/?to=/:account/workers/d1
#    OR via CLI:
wrangler d1 create autologin-db
# Copy the database_id printed and paste into wrangler.toml

# 4. (Optional) Create R2 bucket for screenshots
#    → Go to: https://dash.cloudflare.com/?to=/:account/r2
#    OR via CLI:
wrangler r2 bucket create autologin-screenshots

# 5. Set required secrets
#    Generate AUTH_SECRET at: https://surakshit-vault-pro.pages.dev/#jwt
wrangler secret put AUTH_SECRET
wrangler secret put ENCRYPTION_SECRET
wrangler secret put ADMIN_EMAIL
wrangler secret put ADMIN_PASSWORD

# 6. (Optional) Email alerts — Resend: https://resend.com/api-keys
wrangler secret put RESEND_API_KEY
wrangler secret put RESEND_FROM

# 7. (Optional) Email alerts — Brevo: https://app.brevo.com/settings/keys/api
wrangler secret put BREVO_API_KEY
wrangler secret put BREVO_FROM

# 8. Build and deploy
npm install
npm run build
wrangler deploy --assets out/

# 9. Run DB schema migration
wrangler d1 execute autologin-db --remote --file=schema.sql
```

### After Deploy — Quick Setup
| Step | What to do | Where |
|------|------------|-------|
| 1 | Login with your `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `/login` |
| 2 | Go to Settings → Email Alerts | `/dashboard/settings` |
| 3 | Pick Resend or Brevo and paste API key | Settings page |
| 4 | Add your first credential (website login) | `/dashboard/credentials` |
| 5 | Create a schedule for that credential | `/dashboard/schedules` |
| 6 | Click "Trigger Now" to test auto-login | `/dashboard/schedules` |
| 7 | Check logs to confirm success | `/dashboard/logs` |

### Turso Deploy (Serverless SQLite)
Same as PostgreSQL but with `libsql://` URL — see [Multi-Database Support](#-multi-database-support).

---

## ⚙️ Environment Variables

| Variable | Default | Required | Description |
|----------|---------|:--------:|-------------|
| `DATABASE_URL` | — | Yes | `postgresql://...` OR `libsql://...` (empty = D1) |
| `TURSO_AUTH_TOKEN` | — | Turso only | Auth token for Turso/libSQL |
| `AUTH_SECRET` | dev fallback | ⚠️ Prod | JWT signing key |
| `ENCRYPTION_SECRET` | derived from AUTH_SECRET | ⚠️ Prod | AES-GCM key (separate from JWT) |
| `JWT_SECRET` | AUTH_SECRET | No | Alternative JWT key |
| `FAKE_DATA` | `true` | No | Demo data on/off |
| `ALLOW_REGISTRATION` | `true` | No | Block new signups |
| `ADMIN_EMAIL` | `sudhi@gmal.com` | No | Admin login email |
| `ADMIN_PASSWORD` | `1Sudhi@gmal.com` | No | Admin login password |
| `RESEND_API_KEY` | — | No | Email alerts (Resend) |
| `BREVO_API_KEY` | — | No | Email alerts (Brevo) |
| `SMTP_HOST` | — | No | Email alerts (SMTP) |
| `S3_ENDPOINT` | — | No | Screenshot storage |
| `S3_BUCKET_NAME` | `autologin-screenshots` | No | S3 bucket |

See [`.env.example`](.env.example) for full template.

> [!NOTE]
> **Email Alerts Configuration:** Email configurations can also be dynamically modified inside the browser UI (**Settings** page). UI-configured values (stored in the database) will take precedence over environment variables, allowing live updates without redeploying.

> [!TIP]
> **Quick Links:** The Settings page has a built-in **Quick Links panel** with direct links to Resend, Brevo, Cloudflare D1/R2, Backblaze B2, Turso, and more — click any card to open the relevant dashboard instantly.

---

## 📁 File Structure & Editing Guide

```
autologin-scheduler/
├── src/
│   ├── app/                       Next.js App Router
│   │   ├── page.tsx               Landing page
│   │   ├── login/                 Login (pre-filled demo)
│   │   ├── register/              Register with MX validation
│   │   ├── dashboard/             User dashboard
│   │   │   ├── page.tsx           Overview stats
│   │   │   ├── credentials/       CRUD + trigger + reveal API
│   │   │   ├── schedules/         Multiple schedules + auto/manual mode
│   │   │   ├── launchpad/         Manual login (copy credentials + record)
│   │   │   ├── logs/              Login history
│   │   │   ├── settings/          Config + demo lab
│   │   │   └── admin/             Admin panel
│   │   ├── docs/                  API docs
│   │   ├── deploy/                Deploy guide
│   │   └── api/                   19 REST endpoints
│   ├── components/
│   │   ├── dashboard-shell.tsx
│   │   ├── nav-auth.tsx
│   │   └── logo.tsx               SVG logo component
│   ├── db/
│   │   ├── schema.ts              Barrel (auto-selects PG or Turso)
│   │   ├── schema-pg.ts           PostgreSQL schema
│   │   ├── schema-turso.ts        Turso/SQLite schema
│   │   └── index.ts               DB client (PG / Turso / D1 detection)
│   ├── lib/
│   │   ├── config.ts              Central env config (all defaults)
│   │   ├── security.ts            PBKDF2, AES-GCM, JWT, bot detection
│   │   ├── auth.ts                Session, rate limit, audit
│   │   ├── email-validation.ts    MX DNS via Cloudflare DoH
│   │   └── demo-data.ts           FAKE_DATA engine
│   └── worker/
│       └── index.ts               Cloudflare Worker entry
├── public/
│   ├── logo.png                   AI-generated 512×512
│   ├── logo.svg                   Vector logo (crisp any size)
│   ├── favicon.png                64×64 browser tab
│   └── favicon.svg                Vector favicon
├── .github/
│   ├── ISSUE_TEMPLATE/            Bug + feature templates
│   ├── workflows/ci.yml           Build + typecheck on push
│   ├── FUNDING.yml
│   └── pull_request_template.md
├── wrangler.toml                  Cloudflare config
├── .env.example                   Env template with Turso
├── README.md                      ← You are here
├── CHANGELOG.md                   Version history
├── CONTRIBUTING.md                Contribution guide
├── SECURITY.md                    Security policy + reporting
├── ADMIN_GUIDE.md                 Developer reference
└── LICENSE                        MIT
```

### Common Edits
| What to change | File |
|----------------|------|
| App name | `src/app/layout.tsx` (metadata), `package.json` |
| Colors / theme | `src/app/globals.css` (`@theme`) |
| Logo | `public/logo.svg`, `public/logo.png`, `src/components/logo.tsx` |
| Admin credentials | `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) |
| Demo data content | `src/lib/demo-data.ts` |
| Rate limits | `src/lib/auth.ts` (`checkRateLimit()` calls) |
| PBKDF2 iterations | `src/lib/security.ts` (`PBKDF2_ITERATIONS`) |
| Email disposable blocklist | `src/lib/email-validation.ts` |
| DB schema | `src/db/schema-pg.ts` + `schema-turso.ts` |
| All env defaults | `src/lib/config.ts` |

---

## 🤝 Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for:
- Coding standards
- PR process
- Bug reporting guidelines
- Feature request format

**Quick contributor checklist:**
1. Fork → clone → branch
2. `npm install && npm run dev`
3. Make changes with tests
4. `npm run typecheck && npm run build`
5. Open PR against `main`

---

## 📜 License

**MIT** — Free to self-host, modify, redistribute. See [LICENSE](LICENSE).

If you host or redistribute, please credit **Sudhir Singh** and link to the original repo:
[github.com/SudhirDevOps1/AutoLogin-Scheduler](https://github.com/SudhirDevOps1/AutoLogin-Scheduler)

---

<p align="center">
  Built with 🟣 by <a href="https://github.com/SudhirDevOps1">Sudhir Singh</a>
  <br/>
  <a href="https://github.com/SudhirDevOps1/AutoLogin-Scheduler">⭐ Star on GitHub</a>
  ·
  <a href="https://github.com/SudhirDevOps1/AutoLogin-Scheduler/issues">🐛 Report Bug</a>
  ·
  <a href="https://github.com/SudhirDevOps1/AutoLogin-Scheduler/issues/new?template=feature_request.md">✨ Request Feature</a>
</p>
