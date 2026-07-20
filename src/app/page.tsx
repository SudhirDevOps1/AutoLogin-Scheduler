import Link from "next/link";
import { ContactForm } from "@/components/contact-form";
import {
  Shield,
  Zap,
  Clock,
  Cloud,
  Lock,
  Bell,
  Globe,
  Database,
  GitBranch,
  Terminal,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Code2,
} from "lucide-react";

export default function HomePage() {
  return (
    <main>
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-grid">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-7xl px-6 py-24 md:py-32 relative">
          <div className="flex items-center gap-2 mb-6 justify-center">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-xs text-accent">
              <Sparkles className="w-3 h-3" />
              Inspired by FormForge + PrismAnalytics
            </span>
          </div>
          <h1 className="text-center text-5xl md:text-7xl font-bold tracking-tight leading-[1.05]">
            Never log in again.{" "}
            <span className="gradient-text">Let robots do it.</span>
          </h1>
          <p className="text-center mt-6 text-lg md:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
            Schedule auto-login to Mega, Google Drive, Dropbox, or any website.
            Encrypted credentials, scheduled via Cloudflare Cron + Browser Rendering.
            Self-hosted on your account — zero vendor lock-in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-10">
            <Link
              href="/login"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-2 text-white font-medium hover:opacity-90 transition glow-purple flex items-center justify-center gap-2"
            >
              Login (Admin Ready) <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/deploy"
              className="px-6 py-3 rounded-xl border border-border bg-bg-elev hover:border-accent/50 transition flex items-center justify-center gap-2"
            >
              <Terminal className="w-4 h-4" /> One-click deploy
            </Link>
          </div>

          {/* Admin Info Banner */}
          <div className="max-w-2xl mx-auto mt-8 rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-success shrink-0 mt-0.5" />
              <div>
                <strong className="text-success">Admin account pre-configured</strong> — no registration needed.
                <div className="text-text-muted mt-1">
                  Email: <code className="text-success font-mono">sudhi@gmal.com</code> ·
                  Pass: <code className="text-success font-mono">1Sudhi@gmal.com</code> ·
                  Change in <code>.env</code> anytime.
                </div>
              </div>
            </div>
          </div>

          {/* Hero preview */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="rounded-xl border border-border bg-bg-elev overflow-hidden glow-purple">
              <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-bg-soft">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-3 text-xs text-text-dim">
                  autologin.you.workers.dev/dashboard
                </span>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Scheduled", value: "12", accent: "from-accent to-accent-2" },
                    { label: "Running now", value: "3", accent: "from-emerald-500 to-teal-500" },
                    { label: "Success rate", value: "98%", accent: "from-emerald-500 to-cyan-500" },
                    { label: "Next run", value: "2h", accent: "from-amber-500 to-orange-500" },
                  ].map((s) => (
                    <div key={s.label} className="p-3 rounded-lg border border-border bg-bg">
                      <div className="text-xs text-text-dim">{s.label}</div>
                      <div className={`text-xl font-bold bg-gradient-to-r ${s.accent} bg-clip-text text-transparent`}>
                        {s.value}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  {[
                    { name: "Mega.nz — Work Files", site: "mega.nz", status: "active", next: "in 2h" },
                    { name: "Google Drive — Photos", site: "drive.google.com", status: "active", next: "in 14h" },
                    { name: "Dropbox — Backups", site: "dropbox.com", status: "failed", next: "retry 30m" },
                    { name: "pCloud — Media", site: "my.pcloud.com", status: "active", next: "in 1d" },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border border-border bg-bg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${item.status === "active" ? "bg-success pulse-dot text-success" : "bg-danger"}`} />
                        <div>
                          <div className="text-sm font-medium">{item.name}</div>
                          <div className="text-xs text-text-dim">{item.site}</div>
                        </div>
                      </div>
                      <div className="text-xs text-text-muted">next: {item.next}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything you need. <span className="gradient-text">Nothing you don't.</span>
            </h2>
            <p className="mt-3 text-text-muted max-w-2xl mx-auto">
              Inspired by FormForge's optional-storage pattern and PrismAnalytics's one-click deploy.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Lock, title: "AES-256-GCM Encryption", desc: "Every password encrypted with Web Crypto API. Your secrets never touch plain text, not even in D1." },
              { icon: Clock, title: "Cron Triggers", desc: "Schedule logins every 30 min, 6 hours, 30 days — natural language or 5-field cron." },
              { icon: Globe, title: "Browser Rendering", desc: "Cloudflare Puppeteer runs headless Chrome on the edge. Handles MFA, CAPTCHAs, JS-heavy sites." },
              { icon: Bell, title: "Smart Alerts", desc: "Email via Resend/Brevo/SMTP. Get notified on failure, or silence on success. Configurable per schedule." },
              { icon: Database, title: "Cloudflare D1", desc: "Serverless SQLite, 5GB free. Your data lives in your Cloudflare account. Export anytime." },
              { icon: Cloud, title: "R2/S3 Optional", desc: "Screenshots? Archive to R2, Backblaze, Wasabi, MinIO. Missing config? App works without it." },
              { icon: Shield, title: "PBKDF2 + JWT", desc: "210k iterations password hashing, timing-safe compare, 7-day JWT sessions with revocation." },
              { icon: GitBranch, title: "10+ Users", desc: "Each user's credentials isolated by user_id. Cascade delete, audit logs, rate limiting." },
              { icon: Code2, title: "One-click Deploy", desc: "npm run setup auto-provisions D1, stores secrets, builds, deploys. No copy-pasting IDs." },
            ].map((f) => (
              <div key={f.title} className="card-hover p-6 rounded-xl border border-border bg-bg-elev">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent-2/20 border border-accent/30 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How it works ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-bg-elev border-y border-border">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-12">
            How it works
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Sign up", desc: "Create an account. Your password is PBKDF2-hashed with 210k iterations." },
              { step: "02", title: "Add credentials", desc: "Enter site URL + login + password. Encrypted with AES-256-GCM before hitting D1." },
              { step: "03", title: "Schedule login", desc: "'Every 30 minutes' or a cron expr. We compute next_run automatically." },
              { step: "04", title: "Cron triggers", desc: "Every 6h, Cloudflare checks due schedules. Puppeteer logs in, logs result, sends alert." },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="text-5xl font-bold gradient-text opacity-50 mb-2">{s.step}</div>
                <h3 className="font-semibold mb-1">{s.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Architecture ─────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-center mb-4">
            Built for Cloudflare. <span className="gradient-text">Runs free.</span>
          </h2>
          <p className="text-center text-text-muted mb-10 max-w-2xl mx-auto">
            100% Cloudflare free tier. Workers + D1 + Browser Rendering + optional R2.
          </p>
          <div className="rounded-xl border border-border bg-bg-elev p-6 md:p-8">
            <pre className="text-xs md:text-sm text-text-muted overflow-x-auto leading-relaxed">
{`  ┌─────────────────────────────────────────────────────────────────┐
  │                    Cloudflare Workers                           │
  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │
  │  │  Dashboard  │  │  REST API   │  │  Cron (every 6h)      │  │
  │  │  (Next.js)  │──│  (Hono-ish) │──│  → scheduled logins   │  │
  │  └─────────────┘  └─────────────┘  └───────────┬───────────┘  │
  │         │                  │                    │              │
  │         ▼                  ▼                    ▼              │
  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────┐  │
  │  │  D1 SQLite  │  │  R2 / S3    │  │  Browser Rendering    │  │
  │  │  (Drizzle)  │  │  (optional) │  │  (@cloudflare/        │  │
  │  │             │  │  screenshots│  │   puppeteer)          │  │
  │  └─────────────┘  └─────────────┘  └───────────────────────┘  │
  └─────────────────────────────────────────────────────────────────┘`}
            </pre>
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-bg-elev to-accent-2/10 p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-grid opacity-30" />
            <div className="relative">
              <Zap className="w-10 h-10 mx-auto mb-4 text-accent" />
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
                Deploy in under 5 minutes
              </h2>
              <p className="mt-3 text-text-muted max-w-xl mx-auto">
                One command sets up everything. No credit card. No vendor lock-in. Your data, your Cloudflare account.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/deploy"
                  className="px-6 py-3 rounded-xl bg-white text-bg font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  Deploy to Cloudflare <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/docs"
                  className="px-6 py-3 rounded-xl border border-border bg-bg/50 backdrop-blur hover:border-accent/50 transition flex items-center justify-center gap-2"
                >
                  Read the docs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* ─── Contact (FormForge) ────────────────────────────────────── */}
      <section className="py-20 border-t border-border/40 bg-bg-soft/20 px-6">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-2">Get in Touch</h2>
          <p className="text-text-muted text-sm mb-8">
            Have questions or feedback? Submit this form powered by <strong>FormForge</strong>.
          </p>
          <ContactForm />
        </div>
      </section>
    </main>
  );
}
