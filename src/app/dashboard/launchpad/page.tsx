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
  Lock,
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
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-8rem)] min-h-[500px]">
      {toast && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border toast-in ${
          toast.type === "success" ? "bg-success/10 border-success/30 text-success" : "bg-danger/10 border-danger/30 text-danger"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm">{toast.msg}</span>
        </div>
      )}

      {/* 🛠️ Left Sidebar Panel (30% width on large screens) */}
      <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-4">
        <Link href="/dashboard/credentials" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-text transition">
          <ChevronLeft className="w-4 h-4" /> Back to Credentials
        </Link>

        <div className="rounded-2xl border border-accent/20 bg-bg-elev p-5 flex flex-col gap-4 flex-grow overflow-y-auto">
          <div className="flex items-center gap-3 pb-3 border-b border-border/60">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center glow-purple flex-shrink-0">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold truncate leading-tight">{cred.name}</h1>
              <p className="text-xs text-text-dim truncate mt-0.5">Companion Workspace</p>
            </div>
          </div>

          {action === "login" && (
            <div className="p-3 rounded-xl bg-accent/15 border border-accent/30 text-xs">
              <div className="font-semibold text-text flex items-center gap-1.5 mb-1">
                <span>⚡ One-Click Mode</span>
              </div>
              <p className="text-text-muted leading-relaxed mb-2">
                Click "Copy Username" to copy your login ID. Password is decrypted below.
              </p>
              <button
                onClick={runQuickLogin}
                className="w-full py-1.5 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition text-xs shadow-md"
              >
                Copy Username 🚀
              </button>
            </div>
          )}

          {/* Username */}
          <div className="p-3 rounded-lg bg-bg border border-border">
            <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1 font-semibold">Username</div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium truncate select-all">{cred.username}</div>
              <button
                onClick={() => copyToClipboard(cred.username, "Username")}
                className="p-1.5 rounded hover:bg-bg-soft text-text-muted transition"
                title="Copy Username"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="p-3 rounded-lg bg-bg border border-border">
            <div className="text-[10px] text-text-dim uppercase tracking-wider mb-1 font-semibold">Password</div>
            <div className="flex items-center justify-between gap-2">
              <input
                type={showPassword ? "text" : "password"}
                readOnly
                value={password || "••••••••••••"}
                className="flex-1 min-w-0 bg-transparent text-sm font-mono outline-none select-all"
              />
              <div className="flex items-center gap-1">
                {password ? (
                  <>
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 rounded hover:bg-bg-soft text-text-muted transition"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(password, "Password")}
                      className="p-1 rounded hover:bg-bg-soft text-text-muted transition"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={revealPassword}
                    disabled={revealing}
                    className="px-2 py-1 rounded bg-accent/10 text-accent text-[10px] font-semibold hover:bg-accent/20 transition flex items-center gap-1"
                  >
                    {revealing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Lock className="w-3 h-3" />}
                    Decrypt
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Logger */}
          <div className="mt-auto pt-4 border-t border-border/60">
            <div className="text-[10px] text-text-dim uppercase tracking-wider mb-2 font-semibold">Record Log Status</div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => recordManualLog(true)}
                disabled={submitting}
                className="w-full py-2 rounded-lg bg-success/10 text-success border border-success/30 hover:bg-success/20 font-medium text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Log Success
              </button>
              <button
                onClick={() => recordManualLog(false)}
                disabled={submitting}
                className="w-full py-2 rounded-lg bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20 font-medium text-xs transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5" /> Log Fail / CAPTCHA
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🖥️ Right Embedded Browser Area */}
      <div className="flex-1 flex flex-col rounded-2xl border border-border bg-bg-elev overflow-hidden relative">
        <div className="bg-bg border-b border-border px-4 py-2 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-success text-success shrink-0" />
            <span className="text-text-muted font-medium truncate select-all">{cred.siteUrl}</span>
          </div>
          <a
            href={cred.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline flex items-center gap-1 font-semibold shrink-0"
          >
            Open in new tab <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Info notice about X-Frame-Options */}
        <div className="bg-warning/5 border-b border-warning/10 px-4 py-2 text-[10px] text-warning/90 leading-tight">
          ℹ️ <strong>Embedded View:</strong> If the target site remains blank or displays a connection error, it is blocking embedding for security. Please click <strong>"Open in new tab"</strong> at the top right to complete login.
        </div>

        <div className="flex-1 bg-white relative">
          <iframe
            src={cred.siteUrl}
            className="absolute inset-0 w-full h-full border-none"
            sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </div>
  );
}
