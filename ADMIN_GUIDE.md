# AutoLogin Scheduler — Admin Guide & Quick Fixes

> Created by Sudhir Singh. This guide covers everything from basic admin login to deploying the full Cloudflare stack.

---

## 🧑‍💻 Admin Login (Works Immediately)

No need to register. The `.env` file has the admin account pre-configured.

```
Email: sudhi@gmal.com
Pass:  1Sudhi@gmal.com
```

If you want to change these, edit `.env`:
```env
ADMIN_EMAIL=sudhi@gmail.com
ADMIN_PASSWORD=1Sudhi@gmail.com
```

Then restart the server: `npm run dev`

---

## 🔧 Common Bugs & Fixes

### Bug 1: "Invalid JSON body"
**Cause**: Sending empty or malformed JSON to the API.
**Fix**: Always include the header:
```bash
curl -H "Content-Type: application/json" -d '{"email":"...","password":"..."}' ...
```

### Bug 2: "Invalid input detected"
**Cause**: The security filter detects malicious patterns (SQLi, XSS attempts) in your input.
**Fix**: Don't include `<script>`, `javascript:`, `onerror=`, etc. in usernames or site URLs.

### Bug 3: Admin login fails with "Invalid credentials"
**Cause**: The `.env` variables aren't loaded (Node caches env).
**Fix**: Restart the server after editing `.env`:
```bash
kill $(lsof -t -i:3000) 2>/dev/null; npm run dev
```

### Bug 4: "Account locked"
**Cause**: 5 failed login attempts within 15 minutes.
**Fix**: Wait 15 minutes, or restart the server (resets DB-backed rate limits in memory for dev only — production D1 keeps them).

### Bug 5: Dashboard shows "No schedules yet"
**Cause**: You haven't created any schedules.
**Fix**: Go to `/dashboard/credentials` → Add a credential → Go to `/dashboard/schedules` → Create schedule.

### Bug 6: Screenshots don't save
**Cause**: `S3_ENDPOINT` is empty (optional feature disabled by design).
**Fix**: Configure an S3-compatible bucket (Backblaze B2, Wasabi, MinIO) and set the env vars. The app works fully without this.

---

## 📊 All Free Features Checklist

- [x] User registration & admin account
- [x] PBKDF2 + AES-GCM encryption
- [x] Credential management
- [x] Schedule creation (cron + natural language)
- [x] Manual login trigger
- [x] Login logs with pagination
- [x] Rate limiting & account lockout
- [x] Audit logs
- [x] Responsive dark-theme dashboard
- [x] Cloudflare deploy guide (`/deploy`)
- [x] Full REST API docs (`/docs`)
- [x] Interactive setup (`npm run setup`)
- [x] Smart README (`README.md`)

---

## 🧪 Quick Test Script

```bash
# 1. Health check
curl -s http://localhost:3000/api/health

# 2. Admin login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"sudhi@gmal.com","password":"1Sudhi@gmal.com"}'

# 3. Get me
curl -b cookies.txt http://localhost:3000/api/auth/me

# 4. Create a test credential (optional)
curl -X POST http://localhost:3000/api/credentials \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"Test Site","siteUrl":"https://example.com","username":"user","password":"pass"}'
```

---

## 🏗 Cloudflare Deploy (Optional — Full Serverless)

If you want the app to run 100% serverless (no local PostgreSQL needed):

1. Create `.env` with `AUTH_SECRET` (generate: `openssl rand -hex 32`)
2. Run `npm run setup`
3. Set `S3_BUCKET_NAME` and keys (optional for screenshots)
4. Follow `/deploy` instructions on the site
5. The `wrangler.toml` template is included in `/dashboard/settings`

---

## 🛡 Security Notes

- Never commit `.env` to public repos if it contains real secrets.
- For production, rotate `AUTH_SECRET` regularly.
- The admin account (`ADMIN_EMAIL`) is hardcoded for easy access — change it immediately for production use.

---

© AutoLogin Scheduler — Built with Next.js 16, Drizzle, PostgreSQL, and inspired by FormForge + PrismAnalytics.
