import { Rocket, Terminal, Cloud, CheckCircle2, Zap, ExternalLink } from "lucide-react";

export default function DeployPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-xs text-accent mb-4">
          <Rocket className="w-3 h-3" /> Deploy in 5 minutes
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Deploy to <span className="gradient-text">Cloudflare</span>
        </h1>
        <p className="text-text-muted mt-3 text-lg max-w-2xl">
          Three options: interactive CLI, one-click web button, or manual steps.
          All run on the Cloudflare free tier — no credit card required.
        </p>
      </div>

      {/* Deploy button (FormForge style) */}
      <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-bg-elev to-accent-2/10 p-8 md:p-10 mb-10">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-accent" /> One-click deploy
            </h2>
            <p className="text-text-muted mt-1 text-sm max-w-xl">
              Cloudflare forks the repo into your account, you pick a name, and it deploys everything automatically.
            </p>
          </div>
          <a
            href="https://deploy.workers.cloudflare.com/?url=https://github.com/example/autologin-scheduler"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 rounded-xl bg-white text-bg font-semibold hover:opacity-90 transition flex items-center gap-2 whitespace-nowrap"
          >
            <Cloud className="w-4 h-4" />
            Deploy to Cloudflare
          </a>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-5 mb-12">
        <OptionCard
          number="A"
          icon={Terminal}
          title="Interactive CLI"
          recommended
          steps={[
            "git clone ... && cd autologin-scheduler",
            "npm install",
            "npm run setup",
            "Follow prompts — done!",
          ]}
          note="One command does everything: checks auth, creates D1, stores secrets, builds, deploys."
        />
        <OptionCard
          number="B"
          icon={Rocket}
          title="One-click button"
          steps={[
            'Click "Deploy to Cloudflare" above',
            "Pick project name",
            "Set AUTH_SECRET (or skip to auto-generate)",
            "Click deploy — URL appears in ~2 min",
          ]}
          note="Best for first-timers. No terminal needed."
        />
        <OptionCard
          number="C"
          icon={Cloud}
          title="Manual CLI"
          steps={[
            "npx wrangler login",
            "npx wrangler d1 create autologin-db",
            "Copy database_id → wrangler.toml",
            "npx wrangler secret put AUTH_SECRET",
            "npx wrangler deploy",
          ]}
          note="Use when debugging or customizing the deployment."
        />
      </div>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-5">Environment variables</h2>
        <div className="rounded-xl border border-border bg-bg-elev overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-soft text-xs text-text-dim uppercase tracking-wider">
              <tr>
                <th className="text-left px-4 py-3">Variable</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-left px-4 py-3">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <EnvRow name="AUTH_SECRET" desc="JWT signing secret (openssl rand -hex 32)" required />
              <EnvRow name="ALLOW_REGISTRATION" desc="Set 'false' for owner-only mode" />
              <EnvRow name="RESEND_API_KEY" desc="Email alerts via Resend (100/day free)" />
              <EnvRow name="RESEND_FROM" desc="Sender address for Resend" />
              <EnvRow name="BREVO_API_KEY" desc="Alternative: Brevo/Sendinblue" />
              <EnvRow name="SMTP_HOST" desc="Generic SMTP host (smtp.gmail.com etc.)" />
              <EnvRow name="SMTP_USER" desc="SMTP username" />
              <EnvRow name="SMTP_PASS" desc="SMTP password (use wrangler secret)" />
              <EnvRow name="S3_ENDPOINT" desc="R2/S3 endpoint for screenshots" />
              <EnvRow name="S3_ACCESS_KEY_ID" desc="S3 access key" />
              <EnvRow name="S3_SECRET_ACCESS_KEY" desc="S3 secret (use wrangler secret)" />
              <EnvRow name="S3_BUCKET_NAME" desc="Bucket name" />
              <EnvRow name="S3_REGION" desc="Region (default: us-east-1)" />
            </tbody>
          </table>
        </div>
        <p className="text-sm text-text-muted mt-3">
          💡 S3/R2 storage is <strong className="text-text">completely optional</strong>. If not configured, the app runs normally — screenshots are skipped, logs still work.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-5">Project structure</h2>
        <pre className="p-5 rounded-xl border border-border bg-bg-elev text-xs text-text-muted overflow-x-auto leading-relaxed">
{`autologin-scheduler/
├── src/
│   ├── worker/
│   │   └── index.ts              # Main Worker (Hono)
│   ├── api/
│   │   ├── auth.ts               # PBKDF2 + JWT
│   │   ├── credentials.ts        # CRUD + AES-GCM
│   │   ├── schedules.ts          # CRUD + cron parsing
│   │   └── logs.ts               # Login logs
│   ├── cron/
│   │   └── scheduler.ts          # Cron trigger
│   ├── browser/
│   │   └── automator.ts          # Puppeteer login
│   ├── storage/
│   │   ├── r2.ts                 # Optional S3 upload
│   │   └── db.ts                 # Drizzle + D1
│   ├── lib/
│   │   ├── security.ts           # Encryption, hashing
│   │   └── email.ts              # Resend/Brevo/SMTP
│   └── frontend/
│       └── index.html            # Dashboard UI
├── migrations/
│   └── 0001_initial.sql          # D1 schema
├── wrangler.toml                 # Cloudflare config
├── setup.js                      # One-command setup
└── package.json`}
        </pre>
      </section>

      <section className="rounded-xl border border-border bg-bg-elev p-6">
        <h2 className="text-xl font-bold mb-4">Free tier budget</h2>
        <p className="text-sm text-text-muted mb-4">
          AutoLogin Scheduler runs 100% on Cloudflare's free tier for small workloads:
        </p>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: "Workers", limit: "100k req/day", desc: "Dashboard + API" },
            { label: "D1 storage", limit: "500 MB", desc: "~100k credentials" },
            { label: "Browser Rendering", limit: "10ms/day", desc: "Paid add-on for Puppeteer" },
          ].map((q) => (
            <div key={q.label} className="p-4 rounded-lg border border-border bg-bg">
              <div className="text-xs text-text-muted">{q.label}</div>
              <div className="text-lg font-bold mt-1">{q.limit}</div>
              <div className="text-xs text-text-dim mt-1">{q.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 text-center">
        <a
          href="https://github.com/example/autologin-scheduler"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-text-muted hover:text-text transition"
        >
          <ExternalLink className="w-4 h-4" />
          <span>View on GitHub</span>
        </a>
      </section>
    </main>
  );
}

function OptionCard({
  number,
  icon: Icon,
  title,
  recommended,
  steps,
  note,
}: {
  number: string;
  icon: React.ElementType;
  title: string;
  recommended?: boolean;
  steps: string[];
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-5 card-hover relative">
      {recommended && (
        <div className="absolute -top-2 right-4 px-2 py-0.5 rounded-full bg-accent text-white text-[10px] font-semibold">
          RECOMMENDED
        </div>
      )}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent-2/20 border border-accent/30 flex items-center justify-center text-accent font-bold">
          {number}
        </div>
        <Icon className="w-5 h-5 text-accent" />
        <h3 className="font-semibold">{title}</h3>
      </div>
      <ol className="space-y-1.5 mb-4">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-text-muted">
            <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 shrink-0" />
            <code className="text-xs">{s}</code>
          </li>
        ))}
      </ol>
      <p className="text-xs text-text-dim leading-relaxed">{note}</p>
    </div>
  );
}

function EnvRow({
  name,
  desc,
  required,
}: {
  name: string;
  desc: string;
  required?: boolean;
}) {
  return (
    <tr>
      <td className="px-4 py-3">
        <code className="text-xs px-2 py-0.5 rounded bg-bg-soft text-accent font-mono">{name}</code>
      </td>
      <td className="px-4 py-3 text-text-muted">{desc}</td>
      <td className="px-4 py-3">
        {required ? (
          <span className="text-xs px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/20">
            required
          </span>
        ) : (
          <span className="text-xs text-text-dim">optional</span>
        )}
      </td>
    </tr>
  );
}
