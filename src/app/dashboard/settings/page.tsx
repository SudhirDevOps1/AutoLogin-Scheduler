"use client";

import { useState, useEffect } from "react";
import { Shield, Terminal, Key, Copy, Check, FlaskConical, RefreshCw, Database } from "lucide-react";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string; createdAt: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [demo, setDemo] = useState<{
    demoMode: boolean;
    workspace: { credentials: number; schedules: number; logs: number };
  } | null>(null);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setUser(d.user));
    loadDemoStatus();
  }, []);

  async function loadDemoStatus() {
    const response = await fetch("/api/demo", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setDemo(body);
  }

  async function runDemoAction(action: "seed" | "reset") {
    if (action === "reset" && !confirm("Reset this workspace? Current credentials, schedules and login logs will be replaced with fresh fake beta data.")) {
      return;
    }
    setDemoLoading(true);
    setDemoMessage(null);
    const response = await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const body = await response.json();
    setDemoMessage(response.ok ? body.message : body.error || "Demo action failed");
    await loadDemoStatus();
    setDemoLoading(false);
  }

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

      {demo?.demoMode && (
        <section className="rounded-xl border border-warning/30 bg-gradient-to-br from-warning/5 via-bg-elev to-accent/5 p-6">
          <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
            <div>
              <h2 className="font-semibold flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-warning" /> Demo Lab
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-warning/30 bg-warning/10 text-warning uppercase tracking-wider">Beta only</span>
              </h2>
              <p className="text-sm text-text-muted mt-1">Populate or reset realistic fake data while testing the product.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-success">
              <span className="w-2 h-2 rounded-full bg-success pulse-dot text-success" /> Demo mode active
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              ["Credentials", demo.workspace.credentials],
              ["Schedules", demo.workspace.schedules],
              ["Login logs", demo.workspace.logs],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-border bg-bg p-3 text-center">
                <div className="text-xl font-bold">{value}</div>
                <div className="text-xs text-text-dim mt-1">{label}</div>
              </div>
            ))}
          </div>
          {demoMessage && (
            <div className="mb-4 p-3 rounded-lg border border-success/25 bg-success/5 text-success text-sm">{demoMessage}</div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runDemoAction("seed")}
              disabled={demoLoading}
              className="px-4 py-2 rounded-lg border border-border bg-bg text-sm hover:border-accent/40 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Database className="w-4 h-4" /> Seed if empty
            </button>
            <button
              onClick={() => runDemoAction("reset")}
              disabled={demoLoading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-medium hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${demoLoading ? "animate-spin" : ""}`} /> Reset sample workspace
            </button>
          </div>
          <p className="text-xs text-text-dim mt-3">Reset affects only your current beta workspace. Set <code className="text-warning">DEMO_MODE=false</code> before production.</p>
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
