# Changelog

All notable changes to AutoLogin Scheduler are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.0] — 2026-07-20 · Settings Links + Launchpad Fallback 🔗

### Added
- **Settings Quick Links Panel** — 12 clickable service cards (Resend, Brevo, Gmail SMTP, Cloudflare D1/R2/Workers/Cron, Backblaze B2, Turso, GitHub, Wrangler Docs)
- **Inline API key badges** — “Get API Key” links next to Resend, Brevo, SMTP provider forms
- **JWT Secret Generator** link updated to [Surakshit Vault Pro](https://surakshit-vault-pro.pages.dev/#jwt)
- **Launchpad Smart Iframe Fallback** — auto-detects X-Frame-Options DENY sites within 4 seconds
- **Auto-Launch button** — one click opens blocked site in new tab + auto-copies decrypted password to clipboard
- **metadataBase** set for correct OG/Twitter social media preview images
- **Twitter card metadata** added for rich social sharing previews
- **`/api/logs/manual`** correctly wired in Hono gateway router (was 404 on some edge nodes)
- **Wrangler v4 upgrade** (`wrangler@3` → `wrangler@4`, `@cloudflare/workers-types@4` → `v5`)
- **PrismAnalytics** tracking integration in landing page and dashboard
- **FormForge** contact form embedded in landing page
- `database_id` cleared in `wrangler.toml` for clean one-click deploy compatibility
- **Email Notification Address (Optional)** — user settings field allowing custom alert targets for scheduled jobs
- **worker-mailer Integration** — socket-based native SMTP client for Cloudflare Workers (supports port 465 SSL/TLS)

### Fixed
- `Bucket` and `Github` lucide-react icon names corrected to `HardDrive` and `GitBranch`
- Launchpad manual log endpoint returning 404 on edge deployments
- `metadataBase` warning on every Next.js build
- Cloudflare Workers SMTP compatibility issues (nodemailer unsupported dynamic require resolved via worker-mailer socket fallback)

### Upgraded
- `wrangler` 3.114.17 → 4.112.0
- `@cloudflare/workers-types` 4.x → 5.x

---

## [1.0.0] — 2026-07-20 · First Light 🚀

### Added
- **Full-stack auto-login scheduler** with 16 REST API endpoints
- **Multi-database support** — auto-detects PostgreSQL, Turso (libSQL), or Cloudflare D1 from `DATABASE_URL`
- **AES-256-GCM credential encryption** with separate `ENCRYPTION_SECRET` (key separation)
- **PBKDF2 password hashing** — 210,000 iterations, SHA-512
- **JWT HS256 sessions** with server-side revocation table
- **DB-backed rate limiting** — 5 signup/hr, 20 login/15min, 30 email-check/min
- **Account lockout** — 5 failures → 15-minute lock
- **MX DNS email validation** via Cloudflare DoH + 30+ disposable domain blocklist
- **30+ bot detection patterns** — SQLi, XSS, path traversal, RCE
- **Cloudflare Worker + D1 SQLite** deployment path
- **Cloudflare Cron Triggers** — checks due schedules every 6 hours
- **Cloudflare Browser Rendering** — Puppeteer auto-login on the edge
- **Optional R2/S3** — screenshot storage (falls back to DB reference if not configured)
- **Optional email alerts** — Resend, Brevo, SMTP (all optional)
- **FAKE_DATA toggle** — instantly switch between demo and production mode
- **Multiple schedules per credential** — different cron expressions for same site
- **Admin panel** — system stats, users, audit trail, service status
- **Custom SVG + PNG logo** — shield with clock icon, purple/pink gradient
- **Comprehensive dashboard** — credentials, schedules, logs, settings, admin
- **Dark theme** with responsive design
- **Full audit trail** — every sensitive action logged with hashed IP

### Security
- Timing-safe password comparison
- CSP + HSTS headers
- Tenant isolation on every query
- No PG-specific SQL (cross-database compatible)

### Documentation
- Complete `README.md` with editing guide
- `CONTRIBUTING.md` for open-source contributors
- `SECURITY.md` with vulnerability reporting
- `ADMIN_GUIDE.md` for developers
- `.env.example` with all env variables
- Turso setup guide inline

---

## Upgrade Guide

### From beta → 1.0.0
1. Backup your `.env`
2. Copy new `.env.example` → `.env`
3. Add `ENCRYPTION_SECRET` (separate from `AUTH_SECRET`) for enhanced key separation
4. Old credentials encrypted with `AUTH_SECRET` will need re-saving (or set `ENCRYPTION_SECRET=$AUTH_SECRET` temporarily)
5. Run `npx drizzle-kit push --force`

---

**Maintainer:** Sudhir Singh · [GitHub](https://github.com/SudhirDevOps1/AutoLogin-Scheduler)
