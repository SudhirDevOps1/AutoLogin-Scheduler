# AutoLogin Scheduler — Developer Guide

> Line-by-line reference for developers. Every file, every config, every edit point.

---

## 🗂 Source Map (36 files)

### Core Library (`src/lib/`)
| File | Purpose | Key Functions |
|------|---------|---------------|
| `config.ts` | **Central config** — all env vars with defaults | `config`, `isAdminEmail()` |
| `security.ts` | Crypto: PBKDF2, AES-GCM, JWT, bot detection | `hashPassword`, `encryptCredential`, `signJWT`, `detectMaliciousInput` |
| `auth.ts` | Session, rate limiting, lockout, audit | `getAuth`, `createSession`, `checkRateLimit`, `logAudit` |
| `email-validation.ts` | MX DNS check via Cloudflare DoH | `checkEmailMX`, `isDisposableEmail` |
| `demo-data.ts` | FAKE_DATA engine (6 creds, 6 scheds, 42 logs) | `seedDemoWorkspace`, `isFakeData` |

### Database (`src/db/`)
| File | Tables |
|------|--------|
| `schema.ts` | `users`, `sessions`, `credentials`, `schedules`, `login_logs`, `audit_logs`, `rate_limits` |
| `index.ts` | PG pool + D1 detection (`HAS_PG` flag) |

### API Routes (`src/app/api/`)
| Route File | Methods | Auth |
|------------|---------|------|
| `auth/login/route.ts` | POST | Public |
| `auth/register/route.ts` | POST | Public |
| `auth/logout/route.ts` | POST | Session |
| `auth/me/route.ts` | GET | Session |
| `auth/check-email/route.ts` | GET | Public (rate limited) |
| `credentials/route.ts` | GET, POST, PUT, DELETE | Session |
| `schedules/route.ts` | GET, POST, PUT, DELETE | Session |
| `logs/route.ts` | GET | Session |
| `trigger/route.ts` | POST, PUT | Session / Cron |
| `demo/route.ts` | GET, POST | Session |
| `admin/overview/route.ts` | GET | Admin |
| `health/route.ts` | GET | Public |
| `version/route.ts` | GET | Public |

### Frontend Pages (`src/app/`)
| Page File | Route |
|-----------|-------|
| `page.tsx` | `/` (landing) |
| `login/page.tsx` | `/login` |
| `register/page.tsx` | `/register` |
| `dashboard/page.tsx` | `/dashboard` (overview) |
| `dashboard/credentials/page.tsx` | `/dashboard/credentials` |
| `dashboard/schedules/page.tsx` | `/dashboard/schedules` |
| `dashboard/logs/page.tsx` | `/dashboard/logs` |
| `dashboard/settings/page.tsx` | `/dashboard/settings` |
| `dashboard/admin/page.tsx` | `/dashboard/admin` |
| `docs/page.tsx` | `/docs` |
| `deploy/page.tsx` | `/deploy` |

---

## 🔑 Config (`src/lib/config.ts`)

```typescript
// Every env var has a default. App works even with empty .env (DATABASE_URL only).
AUTH_SECRET: process.env.AUTH_SECRET || "autologin-fallback-dev-secret-..."
ADMIN_EMAIL: process.env.ADMIN_EMAIL || "sudhi@gmal.com"
ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "1Sudhi@gmal.com"
FAKE_DATA: process.env.FAKE_DATA !== "false"  // default true
ALLOW_REGISTRATION: process.env.ALLOW_REGISTRATION !== "false"  // default true
```

**Edit point:** Change defaults in `config.ts` → all routes auto-pick-up.

---

## 🔐 Security Deep Dive

### Password Flow
1. User enters password → `hashPassword()` in `security.ts`
2. Generates 128-bit random salt → `crypto.randomBytes(16)`
3. PBKDF2 with **210,000 iterations**, SHA-512, 64-byte key
4. Stores `hash` + `salt` in `users` table

### Encryption Flow
1. Credential password → `encryptCredential()` in `security.ts`
2. Derives 32-byte key from `AUTH_SECRET` via `SHA-256`
3. AES-256-GCM with random 96-bit IV + 128-bit auth tag
4. Stores `base64(iv):base64(ciphertext):base64(tag)`

### Session Flow
1. Login → `signJWT()` → JWT HS256 with `jti` (unique ID)
2. `createSession()` → stores `SHA-256(token)` in `sessions` table
3. Every request → `getAuth()` verifies JWT + checks `revoked` flag
4. Logout → `revokeSession()` sets `revoked = true`

### Rate Limiting
- Uses `rate_limits` table (DB-backed, survives restarts)
- Sliding window: `key + count + window_end`
- Upsert via `ON CONFLICT DO UPDATE`
- Keys: `login:ip:<hash>`, `login:email:<hash>`, `signup:ip:<hash>`

---

## 🧪 Testing Commands

```bash
# Full health check
curl http://localhost:3000/api/health

# Admin login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"sudhi@gmal.com","password":"1Sudhi@gmal.com"}'

# List credentials
curl -b cookies.txt http://localhost:3000/api/credentials

# Trigger a login
curl -b cookies.txt -X POST http://localhost:3000/api/trigger \
  -H "Content-Type: application/json" \
  -d '{"credentialId":"<id>"}'

# Email validation
curl "http://localhost:3000/api/auth/check-email?email=test@gmail.com"
```

---

## ☁️ Cloudflare D1 Migration

The code auto-detects D1 vs PostgreSQL:
- `DATABASE_URL` set → PostgreSQL (Drizzle `node-postgres`)
- `DATABASE_URL` empty → D1 mode (inject binding at runtime)

For D1 deploy, see `wrangler.toml` and `src/worker/index.ts`.

---

## 📧 Email Alerts & One-Click Actions (`src/lib/email.ts`)

The email alert module supports dual configuration:
1. **Database-Backed Settings (`user_settings` table):** Scoped per user. Users can dynamically configure **Resend**, **Brevo**, or **SMTP** configurations in the Browser Settings UI.
   - API endpoints (`GET/POST /api/settings`) handle CRUD operations.
   - Sensitive credentials (like API Keys and SMTP Passwords) are encrypted using **AES-256-GCM** before saving to the database.
2. **Environment Fallbacks:** If the UI configuration is set to `Disabled`, the module falls back to read default global keys from environment variables (`config.RESEND_API_KEY`, `config.SMTP_HOST`, etc.).
3. **One-Click Quick Login Link:** Sent manual login alerts contain a secure link pointing to `/dashboard/launchpad?id=<credentialId>&action=login`.
4. **Split-Screen Iframe Workspace:** Opens a companion workspace directly in the app. The left side holds username, decrypted password, and log buttons. The right side embeds the target site in a sandboxed `<iframe>` to allow completing the manual check-in process inside the app. If a site sends anti-framing headers (like `X-Frame-Options`), a quick fallback link is provided to open it in a new tab.

---

## ⚡ Shimming & Worker Globals (`src/worker/shims.ts`)

To bypass ES Modules and Next.js compiler constraints in Cloudflare Workers (like `__dirname` ReferenceErrors caused by Server components or third-party dependencies):
* We use a hoisted import of `shims.ts` at the entry point to bind `globalThis.__dirname` and `globalThis.__filename` before Next.js code runs.
* A custom `AsyncLocalStorage` is utilized to shim the `cookies()` API jar context dynamically during request wrapping.

---

© 2026 Sudhir Singh. MIT License.
