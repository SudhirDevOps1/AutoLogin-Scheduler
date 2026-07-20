"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Plus,
  KeyRound,
  Trash2,
  Edit2,
  X,
  Play,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Credential {
  id: string;
  name: string;
  siteUrl: string;
  username: string;
  status: string;
  lastLogin: number | null;
  createdAt: number;
  schedule: { id: string; cronExpr: string; nextRun: number; enabled: boolean } | null;
  lastLog: { id: string; success: boolean; runTime: number } | null;
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function load() {
    const res = await fetch("/api/credentials");
    const data = await res.json();
    if (res.ok) setCredentials(data.credentials || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function showToast(type: "success" | "error", msg: string) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this credential? This will also delete its schedules and logs.")) return;
    const res = await fetch(`/api/credentials?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setCredentials((c) => c.filter((x) => x.id !== id));
      showToast("success", "Credential deleted");
    } else {
      showToast("error", "Failed to delete");
    }
  }

  async function handleTrigger(id: string) {
    setTriggering(id);
    try {
      const res = await fetch("/api/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId: id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("success", "Login succeeded!");
      } else if (res.ok) {
        showToast("error", data.log?.errorMessage || "Login failed");
      } else {
        showToast("error", data.error || "Trigger failed");
      }
      await load();
    } finally {
      setTriggering(null);
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
          <h1 className="text-3xl font-bold tracking-tight">Credentials</h1>
          <p className="text-text-muted mt-1">
            {credentials.length} {credentials.length === 1 ? "credential" : "credentials"} · All passwords AES-GCM encrypted
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white text-sm font-medium hover:opacity-90 transition flex items-center gap-2 glow-purple"
        >
          <Plus className="w-4 h-4" /> Add credential
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-border bg-bg-elev skeleton" />
          ))}
        </div>
      ) : credentials.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-elev p-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-lg bg-bg-soft flex items-center justify-center mb-3">
            <KeyRound className="w-6 h-6 text-text-dim" />
          </div>
          <h3 className="font-semibold">No credentials yet</h3>
          <p className="text-sm text-text-muted mt-1">
            Add your first credential to start automating logins.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/10 text-accent text-sm hover:bg-accent/20 transition"
          >
            <Plus className="w-4 h-4" /> Add your first credential
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {credentials.map((c) => (
            <div
              key={c.id}
              className="rounded-xl border border-border bg-bg-elev p-5 card-hover"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full ${c.status === "active" ? "bg-success" : "bg-danger"} shrink-0`} />
                  <h3 className="font-semibold truncate">{c.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleTrigger(c.id)}
                    disabled={triggering === c.id}
                    title="Test login now"
                    className="p-1.5 rounded-md text-text-muted hover:text-success hover:bg-success/10 transition disabled:opacity-50"
                  >
                    {triggering === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(c);
                      setShowForm(true);
                    }}
                    className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="p-1.5 rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2 text-text-muted">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{c.siteUrl}</span>
                </div>
                <div className="text-text-dim text-xs">
                  as <span className="text-text-muted">{c.username}</span>
                </div>
                <div className="flex items-center gap-3 pt-2 text-xs text-text-dim">
                  {c.schedule ? (
                    <span className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${c.schedule.enabled ? "bg-success" : "bg-text-dim"}`} />
                      {c.schedule.cronExpr}
                    </span>
                  ) : (
                    <span className="text-text-dim/60">No schedule</span>
                  )}
                  {c.lastLogin && (
                    <span>
                      last: {new Date(c.lastLogin).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CredentialForm
          initial={editing}
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

function CredentialForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Credential | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name || "",
    siteUrl: initial?.siteUrl || "",
    username: initial?.username || "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url = initial
        ? `/api/credentials?id=${initial.id}`
        : "/api/credentials";
      const method = initial ? "PUT" : "POST";
      const body = initial && !form.password
        ? {
            name: form.name,
            siteUrl: form.siteUrl,
            username: form.username,
          }
        : form;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        className="w-full max-w-md rounded-xl border border-border bg-bg-elev"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-lg font-semibold">
            {initial ? "Edit credential" : "New credential"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-bg-soft transition"
          >
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
              Friendly name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Mega.nz — Work Files"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">
              Site URL
            </label>
            <input
              type="url"
              required
              value={form.siteUrl}
              onChange={(e) => setForm({ ...form, siteUrl: e.target.value })}
              placeholder="https://mega.nz"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">
              Username / Email
            </label>
            <input
              type="text"
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="you@example.com"
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">
              Password {initial && <span className="text-text-dim">(leave blank to keep current)</span>}
            </label>
            <input
              type="password"
              required={!initial}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={initial ? "••••••••" : ""}
              className="w-full px-3 py-2 rounded-lg border border-border bg-bg text-sm"
            />
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-accent/20 bg-accent/5 text-xs text-accent">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>Password will be encrypted with AES-256-GCM before saving to D1.</span>
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
                "Create"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
