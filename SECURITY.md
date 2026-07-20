# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| **1.2.x** | ✅ Active (Latest) |
| 1.0.x | ✅ Maintained |
| < 1.0 | ❌ End of Life |

## 🔒 Security Features

AutoLogin Scheduler implements defense-in-depth security:

### Password Storage
- **PBKDF2** with 210,000 iterations (SHA-512, 64-byte key)
- Unique 128-bit random salt per user
- `crypto.timingSafeEqual` for constant-time comparison

### Credential Encryption
- **AES-256-GCM** authenticated encryption
- Unique 96-bit IV per credential
- Separate `ENCRYPTION_SECRET` from `AUTH_SECRET` (key separation)

### Session Management
- **JWT HS256** with 7-day expiry
- Server-side revocation via `sessions` table
- Token hash stored (never raw JWT)
- Session invalidated on logout

### Rate Limiting (DB-backed)
| Action | Limit |
|--------|-------|
| Signup | 5 per hour per IP |
| Login | 20 per 15 min per IP |
| Login | 10 per 15 min per email |
| Email check | 30 per minute per IP |

### Account Protection
- **5 failed logins → 15-minute lockout** (auto-cleared)
- All failures logged with hashed IP

### Input Validation
- 30+ regex patterns block:
  - SQL injection (`union select`, `drop table`, etc.)
  - XSS (`<script>`, `javascript:`, `onerror=`)
  - Path traversal (`../`, `/etc/passwd`)
  - RCE attempts (`eval(`, `exec(`)
- Email validated via **MX DNS lookup** (Cloudflare DoH)
- 30+ disposable email domains blocked

### Tenant Isolation
- Every DB query filtered by `userId`
- No cross-tenant data access possible via API

### Audit Trail
- All sensitive actions logged: signup, login, logout, credential CRUD, schedule CRUD
- Hashed IP + user agent recorded

### HTTP Security Headers *(v1.2.0)*
All responses — API + static pages — include OWASP-recommended headers:

| Header | Value |
|--------|-------|
| `X-Frame-Options` | `DENY` — clickjacking blocked |
| `X-Content-Type-Options` | `nosniff` — MIME sniffing blocked |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `Content-Security-Policy` | Allows only self + PrismAnalytics + FormForge |
| `X-Powered-By` | **Removed** (no server fingerprinting) |

Headers are injected at two levels:
1. **Cloudflare Worker middleware** — all API responses
2. **`public/_headers` file** — all static page responses

### CORS Policy *(v1.2.0)*
- Origin restricted to `https://autologin-scheduler.sudhirdevops1.workers.dev` + `localhost`
- Wildcard `*` removed
- Only `GET, POST, PUT, DELETE, OPTIONS` allowed

### Live Security Audit Results *(v1.2.0 — 2026-07-20)*
Automated 12-category penetration test run against production:

| Category | Result |
|----------|--------|
| Unauthenticated access (11 routes) | ✅ All 401 |
| SQL Injection (6 payloads) | ✅ All Blocked |
| XSS Injection (4 payloads) | ✅ All Blocked |
| IDOR cross-user access | ✅ All 404/401 |
| Brute force / rate limiting | ✅ 429 at attempt #1 |
| JWT forgery (5 methods) | ✅ All Rejected |
| Admin privilege escalation | ✅ Blocked 401 |
| Path traversal (`../etc/passwd`) | ✅ Blocked 404 |
| Mass registration spam | ✅ 429 at attempt #1 |
| HTTP security headers | ✅ All 6 headers set |
| Cross-tenant isolation | ✅ Password stripped from list |
| Prototype pollution | ✅ Rejected |
| **TOTAL FAILED** | **0** |

## 🚨 Reporting a Vulnerability

**Do NOT open a public issue for security vulnerabilities.**

Instead:
1. Go to **[Security Advisories](https://github.com/SudhirDevOps1/AutoLogin-Scheduler/security/advisories)**
2. Click **"Report a vulnerability"**
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Impact assessment
   - Suggested fix (if any)

**Response time:** Within 48 hours for initial acknowledgment.

## 🛡 Best Practices for Deployment

### Before going to production:

1. **Change default admin credentials**
   ```env
   ADMIN_EMAIL=your-real-admin@yourdomain.com
   ADMIN_PASSWORD=<strong-random-password>
   ```

2. **Generate unique secrets**
   ```bash
   # Option A: openssl (local)
   openssl rand -hex 32   # For AUTH_SECRET
   openssl rand -hex 32   # For ENCRYPTION_SECRET (separate key)
   openssl rand -hex 32   # For JWT_SECRET (if different from AUTH)

   # Option B: Surakshit Vault Pro (web browser)
   # https://surakshit-vault-pro.pages.dev/#jwt
   ```

3. **Disable public registration** (optional)
   ```env
   ALLOW_REGISTRATION=false
   ```

4. **Disable demo mode**
   ```env
   FAKE_DATA=false
   ```

5. **Use HTTPS** — Cloudflare Workers provides this automatically

6. **Enable database SSL** — for PostgreSQL, use `?sslmode=require`

7. **Monitor audit logs** — check `audit_logs` table regularly

## 🔑 Key Rotation

If a secret is compromised:
1. Generate new `AUTH_SECRET` and `ENCRYPTION_SECRET`
2. Update via `wrangler secret put AUTH_SECRET` (Cloudflare) or `.env` (local)
3. Restart the application — all sessions will be invalidated
4. Credentials encrypted with old `ENCRYPTION_SECRET` will need re-saving

## 📊 Known Limitations

- **CAPTCHA sites**: Puppeteer-based auto-login cannot solve CAPTCHAs — the trigger will return "CAPTCHA required" error
- **2FA sites**: Sites requiring TOTP/SMS 2FA are not supported — you must disable 2FA or use app-specific passwords
- **Browser Rendering quota**: Cloudflare's free tier has limited browser rendering time; heavy usage requires paid plan

For sites without CAPTCHA/2FA, auto-login works reliably.

---

**Maintainer:** Sudhir Singh — [GitHub](https://github.com/SudhirDevOps1)
