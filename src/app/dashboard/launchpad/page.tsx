"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Rocket,
  Copy,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import Link from "next/link";

interface Credential {
  id: string;
  name: string;
  siteUrl: string;
  username: string;
  hasPassword?: boolean;
}

export default function LaunchpadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  const [cred, setCred] = useState<Credential | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (!id) {
      setError("No credential ID provided");
      setLoading(false);
      return;
    }
    fetch("/api/credentials")
      .then((r) => r.json())
      .then((data) => {
        const found = data.credentials?.find((c: Credential) => c.id === id);
        if (found) setCred(found);
        else setError("Credential not found");
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load credential");
        setLoading(false);
      });
  }, [id]);

  // Auto-decrypt password if action=login is present on load
  useEffect(() => {
    if (action === "login" && cred && !password && !revealing) {
      revealPassword();
    }
  }, [action, cred, password, revealing]);

  async function runQuickLogin() {
    if (cred) {
      await navigator.clipboard.writeText(cred.username);
      showToast("Username copied! Press Ctrl+V to paste.", "success");
      window.open(cred.siteUrl, "_blank", "noopener,noreferrer");
    }
  }

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function copyToClipboard(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard`);
  }

  async function revealPassword() {
    if (password) {
      setShowPassword(!showPassword);
      return;
    }
    setRevealing(true);
    try {
      const res = await fetch(`/api/credentials/reveal?id=${id}`);
      const data = await res.json();
      if (res.ok && data.password) {
        setPassword(data.password);
        setShowPassword(true);
      } else {
        showToast(data.error || "Failed to reveal password", "error");
      }
    } catch {
      showToast("Network error revealing password", "error");
    } finally {
      setRevealing(false);
    }
  }

  async function recordManualLog(success: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/logs/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credentialId: id,
          success,
          durationMs: 0,
        }),
      });
      if (res.ok) {
        showToast("Login attempt recorded successfully");
        setTimeout(() => router.push("/dashboard/logs"), 1000);
      } else {
        showToast("Failed to record log", "error");
        setSubmitting(false);
      }
    } catch {
      showToast("Network error", "error");
      setSubmitting(false);
    }
  }

  if (loading) return <div className="h-64 skeleton rounded-xl border border-border" />;
  if (error || !cred) return (
    <div className="p-8 text-center border border-danger/30 bg-danger/5 text-danger rounded-xl">
      <AlertTriangle className="w-8 h-8 mx-auto mb-3" />
      <h2 className="text-lg font-semibold">{error}</h2>
      <Link href="/dashboard/credentials" className="mt-4 inline-block text-sm underline">Back to credentials</Link>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border toast-in ${
          toast.type === "success" ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}

      <Link href="/dashboard/credentials" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text mb-6 transition">
        <ChevronLeft className="w-4 h-4" /> Back
      </Link>

      <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 via-bg-elev to-accent-2/5 p-6 md:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Rocket className="w-32 h-32 text-accent" />
        </div>
        
        <div className="relative z-10">
          {action === "login" && (
            <div className="mb-6 p-4 rounded-xl bg-accent/20 border border-accent/40 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold text-text">⚡ Quick Login Action</h4>
                <p className="text-xs text-text-dim mt-0.5">Click Go to copy your username and open the site.</p>
              </div>
              <button
                onClick={runQuickLogin}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition shadow-md"
              >
                Go 🚀
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center glow-purple">
              <Rocket className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Launchpad</h1>
              <p className="text-sm text-text-dim mt-0.5">Manual intervention mode for {cred.name}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-bg border border-border">
              <div className="text-xs text-text-dim uppercase tracking-wider mb-2">Target Website</div>
              <div className="flex items-center justify-between gap-3">
                <code className="text-sm text-text bg-bg-soft px-3 py-1.5 rounded-lg border border-border block flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {cred.siteUrl}
                </code>
                <a
                  href={cred.siteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition flex items-center gap-2 shrink-0"
                >
                  Open site <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-bg border border-border">
                <div className="text-xs text-text-dim uppercase tracking-wider mb-2">Username</div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={cred.username}
                    className="flex-1 w-full bg-transparent text-sm font-medium outline-none truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(cred.username, "Username")}
                    className="p-2 rounded-md hover:bg-bg-soft text-text-muted transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-bg border border-border">
                <div className="text-xs text-text-dim uppercase tracking-wider mb-2">Password</div>
                <div className="flex items-center gap-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    readOnly
                    value={password || "••••••••••••"}
                    className="flex-1 w-full bg-transparent text-sm font-medium outline-none"
                  />
                  {password ? (
                    <>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 rounded-md hover:bg-bg-soft text-text-muted transition"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(password, "Password")}
                        className="p-2 rounded-md hover:bg-bg-soft text-text-muted transition"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={revealPassword}
                      disabled={revealing}
                      className="px-3 py-1.5 rounded-md bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition flex items-center gap-1.5"
                    >
                      {revealing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                      Reveal
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-accent/20">
            <h3 className="text-sm font-medium mb-3">Record Login Attempt</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => recordManualLog(true)}
                disabled={submitting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/20 font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" /> I logged in successfully
              </button>
              <button
                onClick={() => recordManualLog(false)}
                disabled={submitting}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 font-medium text-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> CAPTCHA / Failed to login
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
