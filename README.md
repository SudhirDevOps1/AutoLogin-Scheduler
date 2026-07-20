# 🔐 AutoLogin Scheduler — v1.0.0

> **Self-hosted, privacy-first, serverless auto-login scheduler.**  
> Deploy on Cloudflare Workers + D1 (free tier) or your own PostgreSQL.  
> Fork of patterns from [FormForge](https://github.com/SudhirDevOps1/FormForge) + [PrismAnalytics](https://github.com/SudhirDevOps1/PrismAnalytics).

[![License: MIT](https://img.shields.io/badge/license-MIT-violet)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers+-D1-orange)](https://workers.cloudflare.com)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-ORM-blue)](https://orm.drizzle.team)
[![GitHub](https://img.shields.io/badge/GitHub-SudhirDevOps1-181717?logo=github)](https://github.com/SudhirDevOps1/AutoLogin-Scheduler)

---

## 📡 Live Preview

**→ https://3000-iycuqrocnnn58jr8pd5gr.e2b.app** ←

| Role | Email | Password |
|------|-------|----------|
| Admin (pre-configured) | `sudhi@gmal.com` | `1Sudhi@gmal.com` |
| Register any new account | `your@email.com` | `YourPass123!` |

---

## 📋 Table of Contents

1. [Features](#-features)
2. [Quick Start (5 seconds)](#-quick-start-5-seconds)
3. [Architecture](#-architecture)
4. [Security](#-security)
5. [API Endpoints (15 total)](#-api-endpoints-15-total)
6. [FAKE_DATA Mode](#-fakedata-mode)
7. [Database Options](#-database-options)
8. [Deploy to Cloudflare](#-deploy-to-cloudflare)
9. [Deploy with PostgreSQL](#-deploy-with-postgresql)
10. [Environment Variables](#-environment-variables)
11. [How to Edit / Customize](#-how-to-edit--customize)
12. [Security Audit](#-security-audit)
13. [File Structure](#-file-structure)
14. [Troubleshooting](#-troubleshooting)
15. [License](#-license)

---

## ✨ Features

### 🔐 Authentication & Security
| Feature | Implementation |
|---------|---------------|
| **Password Hashing** | PBKDF2 with **210,000 iterations** + SHA-512 |
| **Timing-safe Compare** | `crypto.timingSafeEqual` — no timing side-channel |
| **Credential Encryption** | **AES-256-GCM** at rest (Web Crypto API) |
| **Session Management** | **JWT HS256** + session revocation table + 7-day expiry |
| **Rate Limiting** | **DB-backed** (not in-memory): 5 signup/hr, 20 login/15min |
| **Account Lockout** | 5 failed attempts → **15-minute lock** |
| **Bot Detection** | **30+ malicious patterns** (SQLi, XSS, path traversal) |
| **Audit Log** | Every sensitive action logged with user, action, IP hash, timestamp |
| **Email Validation** | **MX DNS lookup** via Cloudflare DoH + disposable email blocklist (30+ domains) |
| **Session Revocation** | `sessions` table with `revoked` flag — instant logout |

### 📊 Dashboard
| Page | Features |
|------|----------|
| Overview | Stats cards (credentials, schedules, success rate), upcoming schedules, recent activity |
| Credentials | CRUD with AES-GCM encryption, manual trigger (test login), delete cascades |
| Schedules | Natural language cron (`every 30 minutes`), 5-field cron, toggle, alert settings |
| Login Logs | Filterable (success/failure), paginated, detail modal with duration + error + screenshot info |
| Settings | Account info, Demo Lab (seed/reset workspace), wrangler.toml config, env reference |
| Admin Panel | System stats (users, credentials, schedules, logs, sessions), recent users, audit trail, service status, beta readiness |

### ☁️ Cloudflare Ready
- **D1 SQLite** (5GB free) — works without PostgreSQL
- **R2/S3 Optional** — screenshots & backups. Empty env = feature disabled
- **Browser Rendering** — Cloudflare Puppeteer for auto-login
- **Cron Triggers** — runs every 6 hours, checks due schedules
- **`wrangler.toml`** included — one command deploy

---

## 🚀 Quick Start (5 seconds)

```bash
# 1. Clone
git clone https://github.com/SudhirDevOps1/AutoLogin-Scheduler.git
cd AutoLogin-Scheduler

# 2. Install
npm install

# 3. Configure .env (already done — just verify)
# Edit .env to set your DATABASE_URL, AUTH_SECRET, ADMIN_EMAIL

# 4. Push schema
npx drizzle-kit push --force

# 5. Start dev
npm run dev

# 6. Open http://localhost:3000/login
#    Login: sudhi@gmal.com / 1Sudhi@gmal.com
```

> **💡 First login auto-creates 6 demo credentials, 6 schedules, and 42 login events.**  
> Set `FAKE_DATA=false` in `.env` for pure production mode.

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Users (Browser)                              │
│   /login → /register → /dashboard → /credentials → /schedules       │
│   /logs → /settings → /admin → /docs → /deploy                      │
└─────────────────────────┬────────────────────────────────────────────┘
                          │
                    ┌─────▼──────┐
                    │  Next.js   │  App Router (RSC + Client)
                    │  API: 15   │  endpoints
                    └─────┬──────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
     ┌────▼────┐    ┌────▼────┐    ┌─────▼─────┐
     │ Auth    │    │ Drizzle │    │ Cloudflare │ (optional)
     │ PBKDF2  │    │  ORM    │    │  Worker    │
     │ JWT     │    │  ┌──────┤    │  ┌───────┐ │
     │ AES-GCM │    │  │  PG  │    │  │  D1   │ │
     └─────────┘    │  │  D1  │    │  │ Pupp. │ │
                    │  └──────┤    │  │ Cron  │ │
                    └─────────┘    └──┴───────┘ │
```

### Data Flow
1. **User** registers/logs in → PBKDF2 verify → JWT issued → session cookie set
2. **User** creates credential → password AES-256-GCM encrypted → stored in DB
3. **User** sets schedule → next_run computed → stored
4. **Cron trigger** (every 6h) → finds due schedules → runs browser automation → saves log
5. **Email alert** sent on failure/success (if configured)

---

## 🛡 Security

### Password Storage
- PBKDF2 with 210,000 iterations, SHA-512, 64-byte derived key
- Unique 128-bit salt per password
- Timing-safe comparison via `crypto.timingSafeEqual`

### Credential Encryption
- AES-256-GCM (authenticated encryption)
- Unique 96-bit IV per credential
- Format: `base64(iv):base64(ciphertext):base64(authTag)`

### Session Protection
- JWT HS256 with 7-day expiry
- `jti` claim for revocation
- Session table with `revoked` flag
- Token hash stored (never raw token)

### Rate Limiting (DB-backed)
| Action | Limit | Window |
|--------|-------|--------|
| Signups | 5 / IP | 1 hour |
| Logins | 20 / IP | 15 minutes |
| Logins | 10 / email | 15 minutes |
| Email check | 30 / IP | 1 minute |
| Account lockout | 5 failures | 15 minutes |

### Bot / Malicious Input Detection
30+ regex patterns blocking:
- SQLi (`union.*select`, `insert.*into`, `drop.*table`, etc.)
- XSS (`<script`, `javascript:`, `onerror=`, etc.)
- Path traversal (`../`, `/etc/passwd`, etc.)
- Remote code execution (`exec(`, `eval(`, etc.)

### Email Validation (MX DNS)
- **Cloudflare DNS over HTTPS** (works in any runtime)
- 30+ disposable email domains blocked
- MX record lookup validates domain can receive mail
- Fallback: `gmail.com` → correct, `gmial.com` → blocked

### Audit Trail
Every sensitive action logged: signup, login, logout, credential CRUD, schedule CRUD, demo reset

---

## 📡 API Endpoints (15 total)

### Auth (5)
| Method | Path | Rate Limit | Description |
|--------|------|-----------|-------------|
| `POST` | `/api/auth/register` | 5/hr | Create account (MX check on frontend) |
| `POST` | `/api/auth/login` | 20/15min | Login (env admin bypass) |
| `POST` | `/api/auth/logout` | — | Revoke session |
| `GET` | `/api/auth/me` | — | Current user + stats |
| `GET` | `/api/auth/check-email` | 30/min | MX/DNS validation |

### Credentials (4)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/credentials` | List (encrypted password never leaves server) |
| `POST` | `/api/credentials` | Create (AES-GCM encrypted) |
| `PUT` | `/api/credentials?id=xxx` | Update |
| `DELETE` | `/api/credentials?id=xxx` | Delete (cascades) |

### Schedules (4)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/schedules` | List |
| `POST` | `/api/schedules` | Create |
| `PUT` | `/api/schedules?id=xxx` | Update |
| `DELETE` | `/api/schedules?id=xxx` | Delete |

### Logs & Trigger (3)
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/logs?page=1` | Login history (+ filter by `success=true/false`) |
| `POST` | `/api/trigger` | Manual login run |
| `PUT` | `/api/trigger` | Cron trigger (signed) |

### System (3)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | No | `{"ok": true}` |
| `GET` | `/api/version` | No | Version, FAKE_DATA status, services |
| `GET` | `/api/admin/overview` | Admin | System stats, users, audit |
| `POST` | `/api/demo` | Auth | Seed/reset demo workspace |

---

## 🎭 FAKE_DATA Mode

Control demo data with the `FAKE_DATA` environment variable:

```env
FAKE_DATA=true   # ← Demo mode: auto-seeds fake data, beta UI
FAKE_DATA=false  # ← Production: no fake data, no demo endpoints
```

### FAKE_DATA=true (default)
- ✅ 6 fake credentials auto-created on login/register
- ✅ 6 schedules with cron expressions
- ✅ 42 mixed success/failure login logs
- ✅ "Demo Lab" visible in Settings
- ✅ `/api/demo` seed/reset endpoints active
- ✅ Beta badges in UI
- ✅ Everything works exactly like production

### FAKE_DATA=false
- ✅ No demo data — clean workspace
- ✅ No `/api/demo` endpoints
- ✅ No beta badges in UI
- ✅ Production login/register/credentials/schedules/logs only
- ✅ All security features still active

**To switch:** edit `.env` → `FAKE_DATA=false` → `npm run dev`

---

## 🗄 Database Options

### Option 1: PostgreSQL (local / self-hosted)
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/autologin-db
```
Requires `pg` package (already in `package.json`).  
Push schema: `npx drizzle-kit push --force`

### Option 2: Cloudflare D1 (serverless, free)
```env
# Unset or comment out DATABASE_URL
# DATABASE_URL=
```
D1 binding injected by Cloudflare at runtime.  
Schema: `npx wrangler d1 migrations apply DB --remote`

### Option 3: Hybrid
- Local dev with PostgreSQL
- Production deploy with D1 (same code, different env)

---

## ☁️ Deploy to Cloudflare

### One-Click (Web)
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/SudhirDevOps1/AutoLogin-Scheduler)

### CLI (Manual)
```bash
# 1. Login
npx wrangler login

# 2. Create D1 database
npx wrangler d1 create autologin-db
# → Copy database_id → paste in wrangler.toml

# 3. Set secrets
npx wrangler secret put AUTH_SECRET
npx wrangler secret put ADMIN_PASSWORD   # optional
npx wrangler secret put RESEND_API_KEY   # optional

# 4. Deploy
npm run build
npm run deploy
```

### Cron Trigger
The `PUT /api/trigger` endpoint is called by Cloudflare Cron Triggers (every 6 hours).  
It finds all enabled schedules where `next_run <= now` and executes them.

To test locally:
```bash
curl -X PUT http://localhost:3000/api/trigger \
  -H "Authorization: Bearer YOUR_AUTH_SECRET"
```

---

## 🔧 Environment Variables

### Required
| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection (leave empty for D1) |
| `AUTH_SECRET` | — | JWT signing + HMAC secret (32+ bytes) |
| `JWT_SECRET` | AUTH_SECRET | Fallback JWT secret |

### Authentication
| Variable | Default | Description |
|----------|---------|-------------|
| `ALLOW_REGISTRATION` | `true` | Set `false` for owner-only mode |
| `FAKE_DATA` | `true` | Set `false` for production |
| `ADMIN_EMAIL` | `sudhi@gmal.com` | Env-based admin bypass |
| `ADMIN_PASSWORD` | `1Sudhi@gmal.com` | Env-based admin password |

### Email (optional — pick one)
| Variable | Provider | Free Tier |
|----------|----------|-----------|
| `RESEND_API_KEY` + `RESEND_FROM` | Resend | 100/day |
| `BREVO_API_KEY` + `BREVO_FROM` | Brevo | 300/day |
| `SMTP_HOST` + `SMTP_USER` + `SMTP_PASS` + `SMTP_FROM` | Any SMTP | Varies |

### Storage (optional)
| Variable | Description |
|----------|-------------|
| `S3_ENDPOINT` | S3-compatible endpoint URL |
| `S3_ACCESS_KEY_ID` | Access key |
| `S3_SECRET_ACCESS_KEY` | Secret key |
| `S3_BUCKET_NAME` | Bucket for screenshots |
| `S3_REGION` | Region (default: `us-east-1`) |

---

## ✏️ How to Edit / Customize

| What to change | File(s) |
|----------------|---------|
| App name / title | `src/app/layout.tsx` (metadata), `package.json` |
| Colors / theme | `src/app/globals.css` (@theme) |
| Admin credentials | `.env` — `ADMIN_EMAIL`, `ADMIN_PASSWORD` |
| Demo data | `src/lib/demo-data.ts` |
| Security settings | `src/lib/security.ts` (iterations, patterns) |
| Rate limits | `src/lib/auth.ts` |
| Email validation | `src/lib/email-validation.ts` (domains, DNS) |
| DB schema | `src/db/schema.ts` |
| Login / Register flow | `src/app/login/page.tsx`, `register/page.tsx` |
| Dashboard overview | `src/app/dashboard/page.tsx`, `overview-client.tsx` |
| API routes | `src/app/api/*/route.ts` |
| Deploy config | `wrangler.toml` |
| Setup script | `setup.js` |

---

## 🛡 Security Audit

| Category | Status | Details |
|----------|--------|---------|
| Password Storage | ✅ | PBKDF2 210k iterations |
| Credential Encryption | ✅ | AES-256-GCM |
| Session Security | ✅ | JWT HS256 + revocation |
| Rate Limiting | ✅ | DB-backed (not in-memory) |
| Account Lockout | ✅ | 5 failures → 15 min |
| Bot Detection | ✅ | 30+ regex patterns |
| Input Sanitization | ✅ | SQLi, XSS, path traversal |
| Email Validation | ✅ | MX DNS + disposable block |
| Audit Trail | ✅ | All actions logged |
| Timing Attacks | ✅ | TimingSafeEqual |
| CSP Headers | ✅ | Applied to all responses |
| HSTS | ✅ | Enforced |

---

## 📁 File Structure

```
autologin-scheduler/
├── .env                        # Environment variables
├── .gitignore
├── README.md                   # ← You are here
├── ADMIN_GUIDE.md              # Dev docs & quick fixes
├── setup.js                    # One-command interactive setup
├── wrangler.toml               # Cloudflare Worker config
├── drizzle.config.json
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout + nav
│   │   ├── globals.css         # Dark theme + animations
│   │   ├── page.tsx            # Landing page
│   │   ├── login/page.tsx      # Auth (pre-filled demo)
│   │   ├── register/page.tsx   # Auth with MX validation
│   │   ├── deploy/page.tsx     # Deploy guide
│   │   ├── docs/page.tsx       # API docs
│   │   ├── dashboard/
│   │   │   ├── layout.tsx      # Auth guard + sidebar
│   │   │   ├── page.tsx        # Overview stats
│   │   │   ├── overview-client.tsx
│   │   │   ├── admin/page.tsx  # Admin panel
│   │   │   ├── credentials/    # CRUD + trigger
│   │   │   ├── schedules/      # Schedule manager
│   │   │   ├── logs/           # Login history
│   │   │   └── settings/       # Settings + demo lab
│   │   └── api/
│   │       ├── auth/           # login, register, logout, me, check-email
│   │       ├── credentials/    # CRUD
│   │       ├── schedules/      # CRUD
│   │       ├── logs/           # Read
│   │       ├── trigger/        # Manual + cron
│   │       ├── demo/           # Seed/reset
│   │       ├── admin/overview/ # System stats
│   │       ├── health/         # Health check
│   │       └── version/        # Version info
│   ├── components/
│   │   ├── dashboard-shell.tsx # Sidebar + nav
│   │   └── nav-auth.tsx        # Auth-aware header
│   ├── db/
│   │   ├── schema.ts           # Drizzle ORM (7 tables)
│   │   └── index.ts            # PG + D1 detection
│   ├── lib/
│   │   ├── security.ts         # PBKDF2, AES-GCM, JWT, bot detection
│   │   ├── auth.ts             # Session, rate limit, audit
│   │   ├── demo-data.ts        # FAKE_DATA engine
│   │   └── email-validation.ts # MX DNS validation
│   └── worker/
│       └── index.ts            # Cloudflare Worker (Hono)
└── public/
```

### Database Schema (7 tables)
- `users` — PBKDF2 hashed passwords, lockout tracking
- `sessions` — JWT revocation, 7-day expiry
- `credentials` — AES-256-GCM encrypted passwords
- `schedules` — Cron expressions, alert config
- `login_logs` — Run history with duration + screenshot keys
- `audit_logs` — Every sensitive action
- `rate_limits` — DB-backed sliding windows

---

## 🔧 Troubleshooting

### "Internal server error" on login
```
→ Check .env has AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD set
→ Check .env.local doesn't override with wrong values
→ Run: rm .env.local (if exists)
→ Restart: npm run dev
```

### "Invalid credentials" with correct admin email
```
→ Admin bypass uses env vars, not DB
→ Check .env: ADMIN_EMAIL and ADMIN_PASSWORD must match exactly
→ Case-sensitive: both email and password
```

### "Email domain does not exist" for valid email
```
→ MX DNS check is strict
→ Some domains (gmal.com, gmial.com) don't exist → correctly blocked
→ Use real domains like gmail.com, outlook.com, your-company.com
```

### "Schedule already exists"
```
→ Each credential can have only one schedule
→ Use PUT /api/schedules?id=xxx to update
→ Delete existing schedule first, then create new
```

### How to reset everything
```bash
node -e "require('dotenv').config(); const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query('DELETE FROM login_logs;DELETE FROM schedules;DELETE FROM credentials;DELETE FROM sessions;DELETE FROM audit_logs;DELETE FROM users;DELETE FROM rate_limits;').then(()=>{console.log('Done');p.end()})"
```

---

## 🤝 Contributing

1. Fork → feature branch → PR to `main`
2. `npm run typecheck && npm run build` must pass
3. Update `README.md` if you add features
4. Add entry in `src/lib/version.ts` (create if needed)

---

## 📜 License

**MIT** — free to self-host, modify, redistribute.  
If you host or redistribute, please credit **AutoLogin Scheduler**.

---

**Built with 🟣 by [Sudhir Singh](https://github.com/SudhirDevOps1)**  
Inspired by [FormForge](https://github.com/SudhirDevOps1/FormForge) + [PrismAnalytics](https://github.com/SudhirDevOps1/PrismAnalytics)
