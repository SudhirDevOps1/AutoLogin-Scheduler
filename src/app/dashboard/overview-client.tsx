"use client";

import Link from "next/link";
import {
  KeyRound,
  Clock,
  CheckCircle2,
  TrendingUp,
  Activity,
  ArrowRight,
  Zap,
  FlaskConical,
} from "lucide-react";

interface Props {
  userEmail: string;
  isAdmin: boolean;
  fakeData?: boolean;
  stats: {
    totalCredentials: number;
    totalSchedules: number;
    activeSchedules: number;
    totalLogins: number;
    successRate: number;
    logins24h: number;
    successRate24h: number;
  };
  schedules: {
    id: string;
    credentialId: string;
    cronExpr: string;
    nextRun: number;
    enabled: boolean;
    credentialName: string;
    siteUrl: string;
  }[];
  recentLogs: {
    id: string;
    runTime: number;
    durationMs: number | null;
    success: boolean;
    errorMessage: string | null;
    credentialName: string;
    siteUrl: string;
  }[];
}

function formatTimeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

function formatCountdown(ts: number) {
  const diff = ts - Date.now();
  if (diff <= 0) return "now";
  const min = Math.floor(diff / 60000);
  if (min < 60) return `in ${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `in ${hr}h`;
  return `in ${Math.floor(hr / 24)}d`;
}

export function OverviewClient({ userEmail, isAdmin, stats, schedules, recentLogs, fakeData }: Props) {
  return (
    <div className="space-y-8">
      {/* Production-grade Welcome banner */}
      <div className="rounded-xl border border-accent/20 bg-bg-elev p-5">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-accent/30">
              {userEmail.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                Welcome, {userEmail}
              </h3>
              <p className="text-xs text-text-dim">
                Secure Workspace · AES-GCM encryption active
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/settings" className="px-3 py-1.5 rounded-lg border border-border text-xs hover:border-accent/50 transition">Settings</Link>
          </div>
        </div>
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <p className="text-text-muted mt-1">Your auto-login activity at a glance</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={KeyRound}
          label="Credentials"
          value={stats.totalCredentials}
          accent="from-accent to-accent-2"
        />
        <StatCard
          icon={Clock}
          label="Active schedules"
          value={stats.activeSchedules}
          sub={`${stats.totalSchedules} total`}
          accent="from-cyan-500 to-blue-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Success rate (24h)"
          value={`${stats.successRate24h}%`}
          sub={`${stats.logins24h} logins`}
          accent="from-emerald-500 to-teal-500"
        />
        <StatCard
          icon={TrendingUp}
          label="All-time logins"
          value={stats.totalLogins}
          sub={`${stats.successRate}% success`}
          accent="from-amber-500 to-orange-500"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming schedules */}
        <div className="rounded-xl border border-border bg-bg-elev overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="font-semibold">Upcoming schedules</h2>
              <p className="text-xs text-text-dim mt-0.5">Next 5 logins</p>
            </div>
            <Link
              href="/dashboard/schedules"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {schedules.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No schedules yet"
                desc="Add a credential and create your first schedule."
                cta={{ href: "/dashboard/credentials", label: "Add credential" }}
              />
            ) : (
              schedules.slice(0, 5).map((s) => (
                <div key={s.id} className="p-4 flex items-center gap-3 hover:bg-bg-soft transition">
                  <div className={`w-2 h-2 rounded-full ${s.enabled ? "bg-success pulse-dot text-success" : "bg-text-dim"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.credentialName}</div>
                    <div className="text-xs text-text-dim truncate">{s.siteUrl} · {s.cronExpr}</div>
                  </div>
                  <div className="text-xs text-accent font-medium">{formatCountdown(s.nextRun)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent logs */}
        <div className="rounded-xl border border-border bg-bg-elev overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h2 className="font-semibold">Recent activity</h2>
              <p className="text-xs text-text-dim mt-0.5">Last 10 logins</p>
            </div>
            <Link
              href="/dashboard/logs"
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentLogs.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No login attempts yet"
                desc="Trigger your first auto-login from the credentials page."
              />
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="p-4 flex items-center gap-3 hover:bg-bg-soft transition">
                  {log.success ? (
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-danger flex items-center justify-center shrink-0">
                      <div className="w-1 h-1 rounded-full bg-danger" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{log.credentialName}</div>
                    <div className="text-xs text-text-dim truncate">
                      {log.success ? `Logged in · ${log.durationMs || 0}ms` : log.errorMessage || "Failed"}
                    </div>
                  </div>
                  <div className="text-xs text-text-dim">{formatTimeAgo(log.runTime)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {stats.totalCredentials === 0 && !fakeData && (
        <div className="rounded-xl border border-border bg-bg-elev p-12 text-center">
          <KeyRound className="w-10 h-10 mx-auto text-text-dim mb-3" />
          <h3 className="text-lg font-semibold">No credentials yet</h3>
          <p className="text-text-muted mt-1 mb-5">Add your first credential to start automating logins.</p>
          <Link
            href="/dashboard/credentials"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition"
          >
            Add credential <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
      {stats.totalCredentials === 0 && fakeData && (
        <div className="rounded-xl border border-accent/30 bg-gradient-to-br from-accent/5 to-accent-2/5 p-8 text-center">
          <Zap className="w-10 h-10 mx-auto text-accent mb-3" />
          <h3 className="text-lg font-semibold">Ready to automate your logins?</h3>
          <p className="text-text-muted mt-1 mb-5">
            Add your first credential and schedule automatic logins.
          </p>
          <Link
            href="/dashboard/credentials"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white font-medium hover:opacity-90 transition"
          >
            Add credential <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${accent} flex items-center justify-center opacity-80`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-text-muted mt-1">{label}</div>
      {sub && <div className="text-xs text-text-dim mt-0.5">{sub}</div>}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  desc,
  cta,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="p-8 text-center">
      <div className="w-10 h-10 mx-auto rounded-lg bg-bg-soft flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-text-dim" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-text-dim mt-1 mb-3">{desc}</div>
      {cta && (
        <Link
          href={cta.href}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-xs hover:bg-accent/20 transition"
        >
          {cta.label} <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}
