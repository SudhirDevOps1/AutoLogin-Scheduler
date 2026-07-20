"use client";

import { useState, useEffect } from "react";
import { Shield, Terminal, Key, Copy, Check, Mail, Server, Eye, EyeOff, Loader2, ExternalLink, Database, Cloud, HardDrive, GitBranch } from "lucide-react";

// Quick resource links used throughout the settings page
const LINKS = {
  resend:          { label: "Resend Dashboard",          url: "https://resend.com/api-keys",                        badge: "Get API Key" },
  brevo:           { label: "Brevo (Sendinblue) Dashboard", url: "https://app.brevo.com/settings/keys/api",           badge: "Get API Key" },
  gmailSmtp:       { label: "Gmail App Password",          url: "https://myaccount.google.com/apppasswords",          badge: "Generate" },
  cloudflare:      { label: "Cloudflare Dashboard",         url: "https://dash.cloudflare.com/",                      badge: "Open" },
  cfWorkers:       { label: "Cloudflare Workers",           url: "https://dash.cloudflare.com/?to=/:account/workers", badge: "Open" },
  cfD1:            { label: "Cloudflare D1 Databases",      url: "https://dash.cloudflare.com/?to=/:account/workers/d1", badge: "Open" },
  cfR2:            { label: "Cloudflare R2 Buckets",        url: "https://dash.cloudflare.com/?to=/:account/r2",      badge: "Open" },
  cfCron:          { label: "Cloudflare Cron Events",       url: "https://dash.cloudflare.com/?to=/:account/workers", badge: "View Logs" },
  github:          { label: "GitHub Repository",            url: "https://github.com/SudhirDevOps1/AutoLogin-Scheduler", badge: "Open" },
  jwtSecret:       { label: "Generate JWT Secret",          url: "https://surakshit-vault-pro.pages.dev/#jwt",          badge: "Generate" },
  backblaze:       { label: "Backblaze B2 (S3-compat)",     url: "https://www.backblaze.com/sign-up/developer",       badge: "Free Tier" },
  turso:           { label: "Turso (libSQL)",               url: "https://turso.tech",                                badge: "Free Tier" },
  wranglerDocs:    { label: "Wrangler Docs",                url: "https://developers.cloudflare.com/workers/wrangler/", badge: "Docs" },
};

function QuickLink({ k }: { k: keyof typeof LINKS }) {
  const l = LINKS[k];
  return (
    <a
      href={l.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-accent/30 bg-accent/5 text-accent hover:bg-accent/15 transition font-medium"
    >
      {l.badge} <ExternalLink className="w-2.5 h-2.5" />
    </a>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email: string; createdAt: number } | null>(null);
  const [copied, setCopied] = useState(false);

  // Email settings states
  const [emailProvider, setEmailProvider] = useState("disabled");
  const [resendApiKey, setResendApiKey] = useState("");
  const [resendFrom, setResendFrom] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [brevoApiKey, setBrevoApiKey] = useState("");
  const [brevoFrom, setBrevoFrom] = useState("");
  const [notificationEmail, setNotificationEmail] = useState("");

  const [showResendKey, setShowResendKey] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [showBrevoKey, setShowBrevoKey] = useState(false);

  const [envInfo, setEnvInfo] = useState<{ hasResend: boolean; hasSmtp: boolean; resendFrom: string; smtpFrom: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  // Test connection states
  const [testLoading, setTestLoading] = useState(false);
  const [testMsg, setTestMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setUser(d.user));

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const s = data.settings;
          setEmailProvider(s.emailProvider);
          setResendApiKey(s.resendApiKey);
          setResendFrom(s.resendFrom);
          setSmtpHost(s.smtpHost);
          setSmtpPort(s.smtpPort);
          setSmtpUser(s.smtpUser);
          setSmtpPass(s.smtpPass);
          setSmtpFrom(s.smtpFrom);
          setBrevoApiKey(s.brevoApiKey);
          setBrevoFrom(s.brevoFrom);
          setNotificationEmail(s.notificationEmail || "");
          setEnvInfo(s.env);
        }
      })
      .catch((err) => console.error("Load settings error:", err));
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

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailProvider,
          resendApiKey,
          resendFrom,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpFrom,
          brevoApiKey,
          brevoFrom,
        }),
      });
      if (res.ok) {
        setSaveMsg({ text: "Settings saved successfully", type: "success" });
      } else {
        const d = await res.json();
        setSaveMsg({ text: d.error || "Failed to save settings", type: "error" });
      }
    } catch {
      setSaveMsg({ text: "Network error saving settings", type: "error" });
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveMsg(null), 4000);
    }
  }

  async function handleTestConnection(e: React.MouseEvent) {
    e.preventDefault();
    if (emailProvider === "disabled") {
      setTestMsg({ text: "Please select an email provider to test.", type: "error" });
      setTimeout(() => setTestMsg(null), 4000);
      return;
    }
    setTestLoading(true);
    setTestMsg(null);
    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailProvider,
          resendApiKey,
          resendFrom,
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpFrom,
          brevoApiKey,
          brevoFrom,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestMsg({ text: data.message || "Test email sent successfully!", type: "success" });
      } else {
        setTestMsg({ text: data.error || "Test connection failed.", type: "error" });
      }
    } catch {
      setTestMsg({ text: "Network error testing connection.", type: "error" });
    } finally {
      setTestLoading(false);
      setTimeout(() => setTestMsg(null), 5000);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-text-muted mt-1">Account info, email alerts and deployment configs</p>
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

      {/* 🔗 Quick Resource Links */}
      <section className="rounded-xl border border-border bg-bg-elev p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-accent" /> Quick Links — Services &amp; Dashboards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { icon: <Mail className="w-4 h-4 text-blue-400" />, title: "Resend", desc: "HTTP email API for Cloudflare Workers", link: "resend" as keyof typeof LINKS },
            { icon: <Mail className="w-4 h-4 text-teal-400" />, title: "Brevo (Sendinblue)", desc: "HTTP email API, free 300/day", link: "brevo" as keyof typeof LINKS },
            { icon: <Mail className="w-4 h-4 text-red-400" />, title: "Gmail SMTP App Password", desc: "For SMTP mode with Gmail", link: "gmailSmtp" as keyof typeof LINKS },
            { icon: <Cloud className="w-4 h-4 text-orange-400" />, title: "Cloudflare Dashboard", desc: "Workers, D1, R2 control panel", link: "cloudflare" as keyof typeof LINKS },
            { icon: <Cloud className="w-4 h-4 text-orange-300" />, title: "Cloudflare Workers", desc: "View / edit your Worker", link: "cfWorkers" as keyof typeof LINKS },
            { icon: <Database className="w-4 h-4 text-purple-400" />, title: "Cloudflare D1", desc: "Your autologin-db SQLite database", link: "cfD1" as keyof typeof LINKS },
            { icon: <HardDrive className="w-4 h-4 text-green-400" />, title: "Cloudflare R2 Buckets", desc: "Screenshot storage (optional)", link: "cfR2" as keyof typeof LINKS },
            { icon: <Database className="w-4 h-4 text-emerald-400" />, title: "Backblaze B2", desc: "S3-compatible bucket (free 10GB)", link: "backblaze" as keyof typeof LINKS },
            { icon: <Database className="w-4 h-4 text-cyan-400" />, title: "Turso (libSQL)", desc: "Serverless SQLite, 9GB free", link: "turso" as keyof typeof LINKS },
            { icon: <GitBranch className="w-4 h-4 text-text" />, title: "GitHub Repo", desc: "Source code & issues", link: "github" as keyof typeof LINKS },
            { icon: <Key className="w-4 h-4 text-yellow-400" />, title: "JWT Secret Generator", desc: "Generate AUTH_SECRET online", link: "jwtSecret" as keyof typeof LINKS },
            { icon: <Terminal className="w-4 h-4 text-text-muted" />, title: "Wrangler CLI Docs", desc: "Official Cloudflare CLI reference", link: "wranglerDocs" as keyof typeof LINKS },
          ].map((item) => (
            <a
              key={item.title}
              href={LINKS[item.link].url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg border border-border hover:border-accent/40 hover:bg-bg-soft transition group"
            >
              <div className="mt-0.5 shrink-0">{item.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold group-hover:text-accent transition truncate">{item.title}</div>
                <div className="text-xs text-text-dim mt-0.5">{item.desc}</div>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-text-dim group-hover:text-accent transition shrink-0 mt-0.5" />
            </a>
          ))}
        </div>
      </section>

      {/* 📧 Email Alerts Configuration */}
      <section className="rounded-xl border border-border bg-bg-elev p-6">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Mail className="w-4 h-4 text-accent" /> Email Alerts Configuration
        </h2>
        <p className="text-sm text-text-muted mb-5">
          Configure how manual triggers or failure reports send alerts. Fallback environment values will be used if set to disabled.
        </p>

        {saveMsg && (
          <div className={`mb-4 p-3 rounded-lg border text-sm ${
            saveMsg.type === "success" ? "bg-success/5 border-success/30 text-success" : "bg-danger/5 border-danger/30 text-danger"
          }`}>
            {saveMsg.text}
          </div>
        )}

        {testMsg && (
          <div className={`mb-4 p-3 rounded-lg border text-sm ${
            testMsg.type === "success" ? "bg-success/5 border-success/30 text-success" : "bg-danger/5 border-danger/30 text-danger"
          }`}>
            {testMsg.text}
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">Email Notification Address (Optional)</label>
            <input
              type="email"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
              placeholder="alerts-inbox@yourdomain.com (Defaults to account email if empty)"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">Email Provider</label>
            <select
              value={emailProvider}
              onChange={(e) => setEmailProvider(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
            >
              <option value="disabled">Disabled (Use Environment Secrets)</option>
              <option value="resend">Resend API (HTTP-based)</option>
              <option value="brevo">Brevo API (HTTP-based)</option>
              <option value="smtp">Custom SMTP Server (TCP socket/Node-only)</option>
            </select>
            {emailProvider === "disabled" && envInfo && (
              <p className="text-xs text-success mt-1.5 font-medium">
                {envInfo.hasResend 
                  ? `✓ Active Env Fallback: Resend (Sender: ${envInfo.resendFrom})` 
                  : envInfo.hasSmtp 
                    ? `✓ Active Env Fallback: SMTP (${envInfo.smtpFrom})` 
                    : "No active environment fallback keys configured."
                }
              </p>
            )}
          </div>

          {emailProvider === "resend" && (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-dim">Get your API key from the Resend dashboard</span>
                <QuickLink k="resend" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted block mb-1.5">Resend API Key</label>
                <div className="relative">
                  <input
                    type={showResendKey ? "text" : "password"}
                    value={resendApiKey}
                    onChange={(e) => setResendApiKey(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-bg text-sm font-mono"
                    placeholder={resendApiKey === "********" ? "••••••••" : "re_..."}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResendKey(!showResendKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-dim hover:text-text transition"
                  >
                    {showResendKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted block mb-1.5">Sender Email Address</label>
                <input
                  type="email"
                  value={resendFrom}
                  onChange={(e) => setResendFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
                  placeholder="onboarding@resend.dev"
                  required
                />
              </div>
            </div>
          )}

          {emailProvider === "brevo" && (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-dim">Get your API key from Brevo (Sendinblue) dashboard</span>
                <QuickLink k="brevo" />
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted block mb-1.5">Brevo API Key (SIB-API-KEY)</label>
                <div className="relative">
                  <input
                    type={showBrevoKey ? "text" : "password"}
                    value={brevoApiKey}
                    onChange={(e) => setBrevoApiKey(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-bg text-sm font-mono"
                    placeholder={brevoApiKey === "********" ? "••••••••" : "xkeysib-..."}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowBrevoKey(!showBrevoKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-dim hover:text-text transition"
                  >
                    {showBrevoKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted block mb-1.5">Sender Email Address</label>
                <input
                  type="email"
                  value={brevoFrom}
                  onChange={(e) => setBrevoFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
                  placeholder="alerts@yourdomain.com"
                  required
                />
              </div>
            </div>
          )}

          {emailProvider === "smtp" && (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-dim">Using Gmail? Generate an App Password</span>
                <QuickLink k="gmailSmtp" />
              </div>
              <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 text-xs text-warning leading-normal mb-2">
                ⚠️ Note: Cloudflare Workers restrict direct TCP socket outbound streams. Custom SMTP port connections will only run when hosting the app via Node.js server. Use Resend or Brevo HTTP API modes for worker deployments.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-muted block mb-1.5">SMTP Host</label>
                  <input
                    type="text"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
                    placeholder="smtp.gmail.com"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-muted block mb-1.5">SMTP Port</label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
                    placeholder="587"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted block mb-1.5">SMTP Username</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
                  placeholder="your-smtp-username"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted block mb-1.5">SMTP Password</label>
                <div className="relative">
                  <input
                    type={showSmtpPass ? "text" : "password"}
                    value={smtpPass}
                    onChange={(e) => setSmtpPass(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-bg text-sm"
                    placeholder={smtpPass === "********" ? "••••••••" : "smtp-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPass(!showSmtpPass)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-dim hover:text-text transition"
                  >
                    {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-muted block mb-1.5">SMTP Sender From</label>
                <input
                  type="text"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
                  placeholder="notifications@yourdomain.com"
                  required
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saveLoading || testLoading}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saveLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
              Save Email Settings
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={saveLoading || testLoading}
              className="px-5 py-2.5 rounded-lg border border-accent/30 bg-accent/5 text-accent text-sm font-medium hover:bg-accent/15 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Test Connection 🧪
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-border bg-bg-elev p-6">
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Key className="w-4 h-4 text-accent" /> Cloudflare Deployment Config
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <QuickLink k="cfWorkers" />
          <QuickLink k="cfD1" />
          <QuickLink k="cfR2" />
          <QuickLink k="cfCron" />
          <QuickLink k="wranglerDocs" />
        </div>
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
        <h2 className="font-semibold mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" /> Required Secrets
        </h2>
        <div className="flex flex-wrap gap-2 mb-4">
          <QuickLink k="jwtSecret" />
          <QuickLink k="resend" />
          <QuickLink k="brevo" />
          <QuickLink k="backblaze" />
          <QuickLink k="turso" />
          <QuickLink k="github" />
        </div>
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
