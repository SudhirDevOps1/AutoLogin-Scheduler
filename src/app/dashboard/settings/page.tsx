"use client";

import { useState, useEffect } from "react";
import { Shield, Terminal, Key, Copy, Check } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string; createdAt: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setUser(d.user));
  }, []);

  async function copyConfig() {
    const config = `# wrangler.toml
name = "autologin-scheduler"
main = "src/worker/index.ts"
compatibility_date = "2026-07-01"

[[d1_databases]]
binding = "DB"
database_name = "autologin-db"

[triggers]
crons = ["0 */6 * * *"]

[browser]
binding = "BROWSER"

[vars]
ALLOW_REGISTRATION = "true"`;
    await navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-text-muted mt-1">Account info and deployment config</p>
      </div>

      {user && (
        <section className="rounded-xl border border-border bg-bg-elev p-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" /> Account
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">User ID</dt>
              <dd className="font-mono text-xs">{user.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Joined</dt>
              <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </section>
      )}

      <section className="rounded-xl border border-border bg-bg-elev p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" /> Cloudflare Deployment Config
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Copy this <code className="px-1.5 py-0.5 rounded bg-bg-soft text-accent text-xs">wrangler.toml</code> into your Cloudflare Worker project
          to deploy the full AutoLogin Scheduler stack.
        </p>
        <div className="relative">
          <pre className="p-4 rounded-lg bg-bg border border-border text-xs text-text-muted overflow-x-auto">
{`name = "autologin-scheduler"
main = "src/worker/index.ts"
compatibility_date = "2026-07-01"

[[d1_databases]]
binding = "DB"
database_name = "autologin-db"

[triggers]
crons = ["0 */6 * * *"]

[browser]
binding = "BROWSER"

[vars]
ALLOW_REGISTRATION = "true"`}
          </pre>
          <button
            onClick={copyConfig}
            className="absolute top-3 right-3 p-2 rounded-lg border border-border bg-bg-soft hover:border-accent/50 transition"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-bg-elev p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" /> Required Secrets
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Set these via <code className="px-1.5 py-0.5 rounded bg-bg-soft text-accent text-xs">wrangler secret put</code>:
        </p>
        <div className="space-y-2">
          {[
            { name: "AUTH_SECRET", desc: "JWT + HMAC signing key (openssl rand -hex 32)", required: true },
            { name: "RESEND_API_KEY", desc: "Email alerts via Resend (optional)", required: false },
            { name: "RESEND_FROM", desc: "Sender email for Resend (optional)", required: false },
            { name: "S3_ENDPOINT", desc: "R2/S3 endpoint for screenshots (optional)", required: false },
            { name: "S3_ACCESS_KEY_ID", desc: "S3 access key (optional)", required: false },
            { name: "S3_SECRET_ACCESS_KEY", desc: "S3 secret (optional)", required: false },
            { name: "S3_BUCKET_NAME", desc: "Screenshot bucket (optional)", required: false },
          ].map((s) => (
            <div key={s.name} className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg-soft transition">
              <code className="text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-mono shrink-0">
                {s.name}
              </code>
              <div className="flex-1">
                <div className="text-sm">{s.desc}</div>
                {s.required && <div className="text-xs text-warning mt-0.5">Required</div>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
