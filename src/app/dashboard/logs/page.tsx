"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";

interface Log {
  id: string;
  credentialId: string;
  runTime: number;
  durationMs: number | null;
  success: boolean;
  screenshotKey: string | null;
  screenshotUrl: string | null;
  errorMessage: string | null;
  createdAt: number;
  credentialName: string;
  siteUrl: string;
  username: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);

  async function load(page: number = 1) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "25",
    });
    if (filter !== "all") params.set("success", filter === "success" ? "true" : "false");

    const res = await fetch(`/api/logs?${params}`);
    const data = await res.json();
    if (res.ok) {
      setLogs(data.logs || []);
      setPagination(data.pagination || { page, pageSize: 25, total: 0, totalPages: 0 });
    }
    setLoading(false);
  }

  useEffect(() => {
    load(1);
  }, [filter]);

  const successCount = logs.filter((l) => l.success).length;
  const failedCount = logs.length - successCount;
  const avgDuration =
    logs.length > 0
      ? Math.round(
          logs.reduce((sum, l) => sum + (l.durationMs || 0), 0) / logs.length
        )
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Login logs</h1>
          <p className="text-text-muted mt-1">
            {pagination.total} {pagination.total === 1 ? "login" : "logins"} recorded
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${
              filter === "all" ? "bg-accent/10 text-accent border border-accent/30" : "border border-border hover:border-accent/30"
            }`}
          >
            All ({pagination.total})
          </button>
          <button
            onClick={() => setFilter("success")}
            className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1.5 ${
              filter === "success" ? "bg-success/10 text-success border border-success/30" : "border border-border hover:border-success/30"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Success
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`px-3 py-1.5 rounded-lg text-sm transition flex items-center gap-1.5 ${
              filter === "failed" ? "bg-danger/10 text-danger border border-danger/30" : "border border-border hover:border-danger/30"
            }`}
          >
            <XCircle className="w-3.5 h-3.5" /> Failed
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Total" value={pagination.total} />
        <MiniStat label="Successes" value={successCount} color="text-success" />
        <MiniStat label="Failures" value={failedCount} color="text-danger" />
        <MiniStat label="Avg. duration" value={`${avgDuration}ms`} />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-bg-elev skeleton" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-elev p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-lg bg-bg-soft flex items-center justify-center mb-3">
            <FileText className="w-6 h-6 text-text-dim" />
          </div>
          <h3 className="font-semibold">No logs yet</h3>
          <p className="text-sm text-text-muted mt-1">
            {filter === "all"
              ? "Trigger a login from credentials to see activity."
              : `No ${filter} logins recorded.`}
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-bg-elev overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-soft text-xs text-text-dim uppercase tracking-wider">
                <tr>
                  <th className="text-left px-5 py-3">Status</th>
                  <th className="text-left px-5 py-3">Credential</th>
                  <th className="text-left px-5 py-3">Duration</th>
                  <th className="text-left px-5 py-3">Time</th>
                  <th className="text-right px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-bg-soft/50 transition">
                    <td className="px-5 py-3">
                      {log.success ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        <XCircle className="w-4 h-4 text-danger" />
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{log.credentialName}</div>
                      <div className="text-xs text-text-dim">{log.siteUrl}</div>
                    </td>
                    <td className="px-5 py-3 text-text-muted">
                      {log.durationMs ? `${log.durationMs}ms` : "—"}
                    </td>
                    <td className="px-5 py-3 text-text-muted text-xs">
                      {new Date(log.runTime).toLocaleString()}
                      <div className="text-text-dim">{formatAgo(log.runTime)}</div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs text-accent hover:underline"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-text-muted">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => load(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-50 hover:border-accent/50 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => load(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-50 hover:border-accent/50 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

function LogDetailModal({ log, onClose }: { log: Log; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-xl border border-border bg-bg-elev max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {log.success ? (
              <CheckCircle2 className="w-5 h-5 text-success" />
            ) : (
              <XCircle className="w-5 h-5 text-danger" />
            )}
            <div>
              <h2 className="text-lg font-semibold">{log.credentialName}</h2>
              <div className="text-xs text-text-dim">{log.siteUrl}</div>
            </div>
          </div>
          <button onClick={onClose} className="text-xs text-accent hover:underline">
            Close ✕
          </button>
        </div>
        <div className="p-5 space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-text-dim text-xs uppercase tracking-wider">Status</dt>
              <dd className={`font-medium mt-1 ${log.success ? "text-success" : "text-danger"}`}>
                {log.success ? "Success" : "Failed"}
              </dd>
            </div>
            <div>
              <dt className="text-text-dim text-xs uppercase tracking-wider">Duration</dt>
              <dd className="font-medium mt-1">{log.durationMs || "—"}ms</dd>
            </div>
            <div>
              <dt className="text-text-dim text-xs uppercase tracking-wider">Run time</dt>
              <dd className="font-medium mt-1">{new Date(log.runTime).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-text-dim text-xs uppercase tracking-wider">Username</dt>
              <dd className="font-medium mt-1">{log.username}</dd>
            </div>
          </dl>

          {log.errorMessage && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3">
              <div className="text-xs text-danger uppercase tracking-wider mb-1">Error</div>
              <code className="text-sm text-text">{log.errorMessage}</code>
            </div>
          )}

          {log.screenshotKey ? (
            <div className="rounded-lg border border-border bg-bg p-4">
              <div className="flex items-center gap-2 text-sm mb-2">
                <ImageIcon className="w-4 h-4 text-accent" />
                <span className="font-medium">Screenshot captured</span>
              </div>
              <code className="text-xs text-text-dim block break-all">{log.screenshotKey}</code>
              <div className="mt-2 text-xs text-text-dim">
                Stored in R2/S3 · {log.screenshotUrl ? <a href={log.screenshotUrl} className="text-accent hover:underline">View</a> : "not configured"}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-bg p-4 text-xs text-text-dim">
              No screenshot · Configure S3_ENDPOINT in env to enable.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-elev p-4">
      <div className="text-xs text-text-muted">{label}</div>
      <div className={`text-xl font-bold mt-1 ${color || ""}`}>{value}</div>
    </div>
  );
}

function formatAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
