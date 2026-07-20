# Contributing to AutoLogin Scheduler v1.2.0

Thank you for your interest in improving AutoLogin Scheduler! Here's how to contribute.

## 🚀 Quick Start for Contributors

```bash
# 1. Fork the repo on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/AutoLogin-Scheduler.git
cd AutoLogin-Scheduler

# 3. Install dependencies
npm install

# 4. Copy env example
cp .env.example .env
# Edit .env: set DATABASE_URL and AUTH_SECRET

# 5. Push schema
npx drizzle-kit push --force

# 6. Run dev server
npm run dev
# → http://localhost:3000
```

## 🧪 Testing Your Changes

Before submitting a PR, run all checks:

```bash
# Type check
npm run typecheck

# Production build
npm run build

# Manual API test
curl http://localhost:3000/api/health
curl http://localhost:3000/api/version

# Deploy to Cloudflare (Wrangler v4 required)
npm run build
npx wrangler deploy --assets out/
```

> **Security Note:** If you add a new API endpoint, make sure it:
> - Calls `requireAuth()` for protected routes
> - Calls `checkRateLimit()` to prevent abuse
> - Validates all inputs with `detectMaliciousInput()`
> - Is registered in `src/worker/index.ts` Hono router

## 📋 Contribution Guidelines

### 1. Coding Standards
- **TypeScript strict mode** — no `any` unless absolutely necessary
- **Zero PG-specific SQL** — use `CAST(x AS INTEGER)` not `x::int` (works with Turso + D1 too)
- **Encrypt secrets** — never store plaintext passwords/tokens
- **Rate limit new endpoints** — use `checkRateLimit()` from `src/lib/auth.ts`

### 2. Pull Request Process
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes with **descriptive commits**
3. Update `README.md` and `CHANGELOG.md` if you add features
4. Update `SECURITY.md` if you add/change security behavior
5. Ensure `npm run build` passes with zero TypeScript errors
6. Open a PR against `main` with:
   - Clear description of the change
   - Screenshots for UI changes
   - Link to related issue (if any)

### 3. Bug Reports
Include:
- Steps to reproduce
- Expected vs actual behavior
- Environment (Node version, OS, DB type)
- Relevant logs from `/api/health` and `/api/version`

### 4. Feature Requests
Open an issue with:
- Use case (why is this needed?)
- Proposed API/UI (how should it work?)
- Alternative solutions considered

## 🏗 Project Structure

```
src/
├── app/              Next.js App Router pages + API routes
├── components/       Reusable React components
├── db/              Drizzle schema (PG + Turso + D1)
├── lib/             Core logic (auth, config, security, email)
└── worker/          Cloudflare Worker entry point
```

## 🛡 Security

If you discover a security vulnerability, **do NOT** open a public issue.  
Email: report security issues privately via [GitHub Security Advisories](https://github.com/SudhirDevOps1/AutoLogin-Scheduler/security/advisories).

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Maintainer:** Sudhir Singh ([@SudhirDevOps1](https://github.com/SudhirDevOps1))
