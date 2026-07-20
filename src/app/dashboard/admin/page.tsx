"use client";

import { useEffect, useState } from "react";
import {
  Users,
  KeyRound,
  Clock,
  Activity,
  ShieldCheck,
  Database,
  Mail,
  HardDrive,
  Globe2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ServerCog,
  Timer,
} from "lucide-react";

interface AdminData {
  mode: string;
  admin: { email: string };
  stats: {
    users: number;
    credentials: number;
    schedules: number;
    activeSchedules: number;
    loginRuns: number;
    successRuns: number;
    failedRuns: number;
    successRate: number;
    avgDuration: number;
    activeSessions: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    emailVerified: boolean;
    failedAttempts: number;
    lockedUntil: number | null;
    createdAt: number;
  }>;
  recentAudits: Array<{
    id: string;
    email: string;
    action: string;
    targetType: string | null;
    createdAt: number;
  }>;
  services: Record<string, { configured: boolean; label: string }>;
}

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/admin/overview", { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) setError(body.error || "Unable to load admin panel");
    else setData(body);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-20 rounded-xl skeleton" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-28 rounded-xl skeleton" />)}
        </div>
        <div className="h-80 rounded-xl skeleton" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-8 text-center">
        <AlertTriangle className="w-8 h-8 text-danger mx-auto mb-3" />
        <h1 className="text-xl font-semibold">Admin panel unavailable</h1>
        <p className="text-sm text-text-muted mt-2">{error}</p>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-lg border border-border text-sm">Try again</button>
      </div>
    );
  }

  const serviceIcons: Record<string, React.ElementType> = {
    database: Database,
    auth: ShieldCheck,
    email: Mail,
    storage: HardDrive,
    browser: Globe2,
  };

  return (
    <div className="space-y-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 rounded-full bg-accent/10 border border-accent/30 text-accent text-[10px] uppercase tracking-wider font-semibold">
              Admin only
            </span>
            <span className="px-2 py-1 rounded-full bg-warning/10 border border-warning/30 text-warning text-[10px] uppercase tracking-wider font-semibold">
              {data.mode}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Control center</h1>
          <p className="text-text-muted mt-1">System health, users, security and beta readiness</p>
        </div>
        <button
          onClick={load}
          className="px-4 py-2 rounded-lg border border-border bg-bg-elev text-sm hover:border-accent/40 transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh data
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Users" value={data.stats.users} sub={`${data.stats.activeSessions} active sessions`} accent="text-cyan-400" />
        <Stat icon={KeyRound} label="Credentials" value={data.stats.credentials} sub="AES-GCM encrypted" accent="text-accent" />
        <Stat icon={Clock} label="Schedules" value={data.stats.schedules} sub={`${data.stats.activeSchedules} enabled`} accent="text-warning" />
        <Stat icon={Activity} label="Login success" value={`${data.stats.successRate}%`} sub={`${data.stats.loginRuns} total runs`} accent="text-success" />
      </div>

      <div className="grid lg:grid-cols-[1.15fr_.85fr] gap-6">
        <section className="rounded-xl border border-border bg-bg-elev overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> Recent users</h2>
            <p className="text-xs text-text-dim mt-1">Latest registered and env-provisioned accounts</p>
          </div>
          <div className="divide-y divide-border">
            {data.recentUsers.map((user) => {
              const locked = Boolean(user.lockedUntil && user.lockedUntil > Date.now());
              return (
                <div key={user.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-bg-soft/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/30 to-accent-2/30 flex items-center justify-center text-xs font-semibold uppercase">
                      {user.email.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{user.email}</div>
                      <div className="text-xs text-text-dim">Joined {formatAgo(user.createdAt)} · {user.failedAttempts} failed attempts</div>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-1 rounded-full border ${locked ? "border-danger/30 bg-danger/10 text-danger" : "border-success/30 bg-success/10 text-success"}`}>
                    {locked ? "locked" : "active"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-bg-elev overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2"><ServerCog className="w-4 h-4 text-accent" /> Service status</h2>
            <p className="text-xs text-text-dim mt-1">Detected from server environment</p>
          </div>
          <div className="p-3 space-y-1">
            {Object.entries(data.services).map(([key, service]) => {
              const Icon = serviceIcons[key] || ServerCog;
              return (
                <div key={key} className="p-3 rounded-lg hover:bg-bg-soft flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-bg flex items-center justify-center border border-border">
                    <Icon className="w-4 h-4 text-text-muted" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium capitalize">{key}</div>
                    <div className="text-xs text-text-dim">{service.label}</div>
                  </div>
                  {service.configured ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-border bg-bg-elev overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-accent" /> Recent audit trail</h2>
          </div>
          <div className="divide-y divide-border max-h-[390px] overflow-y-auto">
            {data.recentAudits.map((audit) => (
              <div key={audit.id} className="px-5 py-3 flex gap-3">
                <div className="mt-1 w-2 h-2 rounded-full bg-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm"><span className="text-text-muted">{audit.email}</span> · <code className="text-accent text-xs">{audit.action}</code></div>
                  <div className="text-xs text-text-dim mt-0.5">{audit.targetType || "system"} · {formatAgo(audit.createdAt)}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-bg-elev p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-4"><Timer className="w-4 h-4 text-accent" /> Beta readiness</h2>
          <div className="space-y-3">
            {[
              ["Authentication & sessions", true, "PBKDF2, JWT, revocation"],
              ["Encrypted credentials", true, "AES-256-GCM at rest"],
              ["CRUD & tenant isolation", true, "User-scoped database queries"],
              ["Schedules & logs", true, "Interactive beta simulation"],
              ["Email delivery", data.services.email.configured, "Configure Resend or SMTP"],
              ["Screenshot storage", data.services.storage.configured, "Optional R2/S3"],
              ["Real browser automation", data.services.browser.configured, "Production Cloudflare binding"],
            ].map(([label, ready, detail]) => (
              <div key={String(label)} className="flex items-center gap-3 p-2.5 rounded-lg bg-bg border border-border">
                {ready ? <CheckCircle2 className="w-4 h-4 text-success shrink-0" /> : <AlertTriangle className="w-4 h-4 text-warning shrink-0" />}
                <div className="flex-1">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-text-dim">{detail}</div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider ${ready ? "text-success" : "text-warning"}`}>{ready ? "ready" : "beta"}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniMetric label="Successful runs" value={data.stats.successRuns} color="text-success" />
        <MiniMetric label="Failed runs" value={data.stats.failedRuns} color="text-danger" />
        <MiniMetric label="Avg duration" value={`${data.stats.avgDuration}ms`} color="text-accent" />
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string | number; sub: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-5">
      <Icon className={`w-5 h-5 ${accent} mb-4`} />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-text-muted mt-1">{label}</div>
      <div className="text-xs text-text-dim mt-0.5">{sub}</div>
    </div>
  );
}

function MiniMetric({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-4 text-center">
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-text-dim mt-1">{label}</div>
    </div>
  );
}

function formatAgo(timestamp: number) {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diff / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
