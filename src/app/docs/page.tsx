import { BookOpen, Code, Server, Lock } from "lucide-react";

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-xs text-accent mb-4">
          <BookOpen className="w-3 h-3" /> API Reference
        </div>
        <h1 className="text-4xl font-bold tracking-tight">
          Documentation
        </h1>
        <p className="text-text-muted mt-3 text-lg">
          Self-host on Cloudflare Workers + D1, PostgreSQL, or Turso (libSQL).
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-12">
        {[
          { icon: Code, title: "REST API", desc: "16 endpoints for auth, credentials, schedules, and logs" },
          { icon: Server, title: "Multi-Database", desc: "PostgreSQL, Turso (libSQL), or Cloudflare D1 — auto-detected" },
          { icon: Lock, title: "Security model", desc: "PBKDF2 + AES-GCM + JWT + rate limiting + MX email" },
          { icon: BookOpen, title: "Quick start", desc: "Deploy in 5 minutes with npm run setup" },
        ].map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-bg-elev p-5 card-hover">
            <c.icon className="w-5 h-5 text-accent mb-3" />
            <h3 className="font-semibold">{c.title}</h3>
            <p className="text-sm text-text-muted mt-1">{c.desc}</p>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-accent" /> Authentication
        </h2>
        <p className="text-sm text-text-muted mb-3">
          All authenticated endpoints require a session cookie set via <code className="px-1.5 py-0.5 rounded bg-bg-soft text-accent text-xs">/api/auth/login</code>.
        </p>
        <Endpoint method="POST" path="/api/auth/register" auth={false} desc="Create a new account (rate limited 5/hr)" />
        <Endpoint method="POST" path="/api/auth/login" auth={false} desc="Login with email + password" />
        <Endpoint method="POST" path="/api/auth/logout" auth desc="Revoke current session" />
        <Endpoint method="GET" path="/api/auth/me" auth desc="Current user + stats" />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-accent" /> Credentials
        </h2>
        <Endpoint method="GET" path="/api/credentials" auth desc="List your credentials (encrypted passwords never exposed)" />
        <Endpoint method="POST" path="/api/credentials" auth desc="Add a new credential. Password encrypted with AES-256-GCM." />
        <Endpoint method="PUT" path="/api/credentials?id=:id" auth desc="Update a credential" />
        <Endpoint method="DELETE" path="/api/credentials?id=:id" auth desc="Delete a credential (cascades to schedules & logs)" />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5 text-accent" /> Schedules & Logs
        </h2>
        <Endpoint method="GET" path="/api/schedules" auth desc="List all schedules with next_run" />
        <Endpoint method="POST" path="/api/schedules" auth desc="Create a schedule (cron expr or 'every 30 minutes')" />
        <Endpoint method="PUT" path="/api/schedules?id=:id" auth desc="Update schedule (toggle enabled, change cron)" />
        <Endpoint method="DELETE" path="/api/schedules?id=:id" auth desc="Delete a schedule" />
        <Endpoint method="GET" path="/api/logs?page=1&pageSize=25" auth desc="List login logs with pagination + filtering" />
        <Endpoint method="POST" path="/api/trigger" auth desc="Manually trigger a login run" />
        <Endpoint method="PUT" path="/api/trigger" auth={false} desc="Cron hook (called by Cloudflare Cron Trigger)" />
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Cron Expression Formats</h2>
        <div className="rounded-xl border border-border bg-bg-elev p-5 space-y-2 text-sm font-mono">
          <div><span className="text-accent">every 30 minutes</span> <span className="text-text-dim">→ 30 min interval</span></div>
          <div><span className="text-accent">every 6 hours</span> <span className="text-text-dim">→ 6 hour interval</span></div>
          <div><span className="text-accent">every 1 day</span> <span className="text-text-dim">→ 24 hour interval</span></div>
          <div><span className="text-accent">21600</span> <span className="text-text-dim">→ raw seconds</span></div>
          <div><span className="text-accent">0 */6 * * *</span> <span className="text-text-dim">→ 5-field cron</span></div>
        </div>
      </section>

      <section className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 to-accent-2/5 p-8">
        <h2 className="text-xl font-bold mb-3">Security highlights</h2>
        <ul className="space-y-2 text-sm text-text-muted">
          <li>✓ PBKDF2 with <strong className="text-text">210,000 iterations</strong> + SHA-512</li>
          <li>✓ AES-256-GCM for credential encryption (Web Crypto API)</li>
          <li>✓ JWT HS256 with 7-day expiry + session revocation table</li>
          <li>✓ Timing-safe password comparison</li>
          <li>✓ DB-backed rate limiting (5 signup/hr, 20 login/15min)</li>
          <li>✓ Account lockout (5 failures → 15 min lock)</li>
          <li>✓ Bot detection with 30+ malicious patterns (SQLi, XSS, traversal)</li>
          <li>✓ Audit log for every sensitive action</li>
          <li>✓ MX DNS email validation (Cloudflare DoH + disposable block)</li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-4">Database Backends</h2>
        <p className="text-sm text-text-muted mb-4">
          Auto-detected from <code className="px-1.5 py-0.5 rounded bg-bg-soft text-accent text-xs">DATABASE_URL</code> scheme. Same code, zero changes.
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border bg-bg-elev p-4">
            <div className="text-sm font-semibold text-accent mb-1">PostgreSQL</div>
            <code className="text-xs text-text-dim">postgresql://...</code>
            <p className="text-xs text-text-muted mt-2">Self-host or managed (Neon, Supabase, etc.)</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-elev p-4">
            <div className="text-sm font-semibold text-accent mb-1">Turso (libSQL)</div>
            <code className="text-xs text-text-dim">libsql://... + TURSO_AUTH_TOKEN</code>
            <p className="text-xs text-text-muted mt-2">Serverless SQLite, free 9GB tier</p>
          </div>
          <div className="rounded-lg border border-border bg-bg-elev p-4">
            <div className="text-sm font-semibold text-accent mb-1">Cloudflare D1</div>
            <code className="text-xs text-text-dim">DATABASE_URL=(empty)</code>
            <p className="text-xs text-text-muted mt-2">Edge SQLite, free 5GB tier</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Endpoint({
  method,
  path,
  auth,
  desc,
}: {
  method: string;
  path: string;
  auth?: boolean;
  desc: string;
}) {
  const colors: Record<string, string> = {
    GET: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    POST: "bg-success/10 text-success border-success/30",
    PUT: "bg-warning/10 text-warning border-warning/30",
    DELETE: "bg-danger/10 text-danger border-danger/30",
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg-elev transition border border-transparent hover:border-border">
      <span className={`px-2 py-0.5 rounded border text-xs font-mono font-semibold shrink-0 ${colors[method]}`}>
        {method}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-sm font-mono text-text">{path}</code>
          {auth && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
              🔒 auth
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-1">{desc}</p>
      </div>
    </div>
  );
}
