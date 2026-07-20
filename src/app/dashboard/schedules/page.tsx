"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Plus,
  Clock,
  Trash2,
  Edit2,
  X,
  Loader2,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Credential {
  id: string;
  name: string;
  siteUrl: string;
}

interface Schedule {
  id: string;
  credentialId: string;
  cronExpr: string;
  nextRun: number;
  enabled: boolean;
  alertOnFailure: boolean;
  alertOnSuccess: boolean;
  takeScreenshot: boolean;
  createdAt: number;
  credentialName: string;
  siteUrl: string;
  username: string;
  credStatus: string;
}

const QUICK_INTERVALS = [
  { label: "Every 30 minutes", value: "every 30 minutes" },
  { label: "Every hour", value: "every 1 hour" },
  { label: "Every 6 hours", value: "every 6 hours" },
  { label: "Every day", value: "every 1 day" },
  { label: "Every 7 days", value: "every 7 days" },
  { label: "Every 30 days", value: "every 30 days" },
];

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Schedule | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function load() {
    const [schedRes, credRes] = await Promise.all([
      fetch("/api/schedules"),
      fetch("/api/credentials"),
    ]);
    const [schedData, credData] = await Promise.all([
      schedRes.json(),
      credRes.json(),
    ]);
    if (schedRes.ok) setSchedules(schedData.schedules || []);
    if (credRes.ok) setCredentials(credData.credentials || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleToggle(s: Schedule) {
    await fetch(`/api/schedules?id=${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !s.enabled }),
    });
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this schedule?")) return;
    const res = await fetch(`/api/schedules?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setSchedules((s) => s.filter((x) => x.id !== id));
      showToast("success", "Schedule deleted");
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border toast-in ${
          toast.type === "success" ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Schedules</h1>
          <p className="text-text-muted mt-1">
            {schedules.length} {schedules.length === 1 ? "schedule" : "schedules"} · {schedules.filter((s) => s.enabled).length} active
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          disabled={credentials.length === 0}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-medium hover:opacity-90 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={credentials.length === 0 ? "Add a credential first" : undefined}
        >
          <Plus className="w-4 h-4" /> New schedule
        </button>
      </div>

      {credentials.length === 0 ? (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-6 text-center">
          <p className="text-sm text-text-muted">Add a credential before creating schedules.</p>
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-xl border border-border bg-bg-elev skeleton" />
          ))}
        </div>
      ) : schedules.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-elev p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-lg bg-bg-soft flex items-center justify-center mb-3">
            <Clock className="w-6 h-6 text-text-dim" />
          </div>
          <h3 className="font-semibold">No schedules yet</h3>
          <p className="text-sm text-text-muted mt-1">
            Schedule automatic logins to run on a recurring basis.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-bg-elev overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-bg-soft text-xs text-text-dim uppercase tracking-wider">
              <tr>
                <th className="text-left px-5 py-3">Credential</th>
                <th className="text-left px-5 py-3">Frequency</th>
                <th className="text-left px-5 py-3">Next run</th>
                <th className="text-left px-5 py-3">Alerts</th>
                <th className="text-right px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {schedules.map((s) => (
                <tr key={s.id} className="hover:bg-bg-soft/50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${s.enabled ? "bg-success" : "bg-text-dim"}`} />
                      <div>
                        <div className="font-medium">{s.credentialName}</div>
                        <div className="text-xs text-text-dim">{s.siteUrl}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <code className="text-xs px-2 py-0.5 rounded bg-bg-soft border border-border text-accent">
                      {s.cronExpr}
                    </code>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-xs text-text-muted">{formatCountdown(s.nextRun)}</div>
                    <div className="text-xs text-text-dim">{new Date(s.nextRun).toLocaleString()}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      {s.alertOnFailure && (
                        <span className="text-xs px-2 py-0.5 rounded bg-danger/10 text-danger border border-danger/20">
                          on fail
                        </span>
                      )}
                      {s.alertOnSuccess && (
                        <span className="text-xs px-2 py-0.5 rounded bg-success/10 text-success border border-success/20">
                          on success
                        </span>
                      )}
                      {!s.alertOnFailure && !s.alertOnSuccess && (
                        <span className="text-xs text-text-dim">none</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggle(s)}
                        className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition"
                        title={s.enabled ? "Pause" : "Enable"}
                      >
                        {s.enabled ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => {
                          setEditing(s);
                          setShowForm(true);
                        }}
                        className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ScheduleForm
          initial={editing}
          credentials={credentials}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={async () => {
            await load();
            setShowForm(false);
            setEditing(null);
            showToast("success", editing ? "Updated" : "Created");
          }}
        />
      )}
    </div>
  );
}

function ScheduleForm({
  initial,
  credentials,
  onClose,
  onSaved,
}: {
  initial: Schedule | null;
  credentials: Credential[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    credentialId: initial?.credentialId || credentials[0]?.id || "",
    cronExpr: initial?.cronExpr || "every 6 hours",
    enabled: initial?.enabled ?? true,
    alertOnFailure: initial?.alertOnFailure ?? true,
    alertOnSuccess: initial?.alertOnSuccess ?? false,
    takeScreenshot: initial?.takeScreenshot ?? true,
  });
  const [custom, setCustom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url = initial ? `/api/schedules?id=${initial.id}` : "/api/schedules";
      const method = initial ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-bg-elev max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-bg-elev">
          <h2 className="text-lg font-semibold">
            {initial ? "Edit schedule" : "New schedule"}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-bg-soft transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-danger/30 bg-danger/5 text-danger text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">
              Credential
            </label>
            <select
              required
              value={form.credentialId}
              onChange={(e) => setForm({ ...form, credentialId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
              disabled={!!initial}
            >
              {credentials.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.siteUrl}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">
              Frequency
            </label>
            {!custom ? (
              <div className="grid grid-cols-2 gap-2">
                {QUICK_INTERVALS.map((q) => (
                  <button
                    key={q.value}
                    type="button"
                    onClick={() => setForm({ ...form, cronExpr: q.value })}
                    className={`px-3 py-2 rounded-lg border text-sm text-left transition ${
                      form.cronExpr === q.value
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-bg hover:border-accent/30"
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type="text"
                value={form.cronExpr}
                onChange={(e) => setForm({ ...form, cronExpr: e.target.value })}
                placeholder="every 30 minutes or 0 */6 * * *"
                className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
              />
            )}
            <button
              type="button"
              onClick={() => setCustom(!custom)}
              className="mt-2 text-xs text-accent hover:underline"
            >
              {custom ? "← Use quick presets" : "Custom cron expression →"}
            </button>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-sm font-medium text-text-muted">Options</label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                className="rounded border-border"
              />
              <span>Enabled</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.alertOnFailure}
                onChange={(e) => setForm({ ...form, alertOnFailure: e.target.checked })}
                className="rounded border-border"
              />
              <span>Alert on failure (via email)</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.alertOnSuccess}
                onChange={(e) => setForm({ ...form, alertOnSuccess: e.target.checked })}
                className="rounded border-border"
              />
              <span>Alert on success</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.takeScreenshot}
                onChange={(e) => setForm({ ...form, takeScreenshot: e.target.checked })}
                className="rounded border-border"
              />
              <span>Save screenshot to R2/S3 (if configured)</span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-bg-soft transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : initial ? (
                "Update"
              ) : (
                "Create schedule"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
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
