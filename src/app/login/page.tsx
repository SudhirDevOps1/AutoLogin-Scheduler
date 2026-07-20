"use client";

import { useState, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  LockKeyhole,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [fakeData, setFakeData] = useState(true);

  const DEMO_EMAIL = fakeData ? "sudhi@gmal.com" : "";
  const DEMO_PASS  = fakeData ? "1Sudhi@gmal.com" : "";

  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASS);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(() => {
        const isFake = document.cookie.includes("FAKE_DATA") ||
          localStorage.getItem("FAKE_DATA") !== "false";
        setFakeData(isFake);
      })
      .catch(() => {});
  }, []);

  async function login(loginEmail: string, loginPassword: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(email, password);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12 bg-grid">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center mb-4 glow-purple">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-accent/30 bg-accent/10 text-accent font-semibold">
              {fakeData ? "Demo ready" : "Production"}
            </span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Sign in</h1>
          <p className="text-text-muted mt-2 text-sm text-center">
            {fakeData ? "Explore every screen with sample data" : "Production AutoLogin Scheduler"}
          </p>
        </div>

        {fakeData && (
          <div className="mb-4 rounded-xl border border-accent/30 bg-gradient-to-br from-accent/10 to-accent-2/5 p-4">
            <div className="flex gap-3">
              <Sparkles className="w-5 h-5 text-accent shrink-0 mt-1" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold">FAKE_DATA workspace</div>
                <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                  6 credentials, 6 schedules and 42 login events auto-created on login.
                </p>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => login(DEMO_EMAIL, DEMO_PASS)}
                  className="mt-3 w-full py-2 rounded-lg bg-white text-bg text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  {loading ? <div className="spinner" /> : <Sparkles className="w-4 h-4" />}
                  Enter demo workspace
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mb-4 text-[11px] text-text-dim uppercase tracking-widest">
          <div className="h-px bg-border flex-1" />
          {fakeData ? "or sign in manually" : "sign in"}
          <div className="h-px bg-border flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-border bg-bg-elev p-6">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-danger/30 bg-danger/5 text-danger text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border bg-bg text-sm"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-text-dim hover:text-text transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <><div className="spinner" /> Signing in...</> : <><LockKeyhole className="w-4 h-4" /> Sign in</>}
          </button>
        </form>

        {fakeData && (
          <div className="mt-4 rounded-lg border border-border bg-bg-elev/60 p-3 text-xs text-text-dim">
            <div className="flex justify-between gap-3">
              <span>Demo email</span>
              <code className="text-accent">{DEMO_EMAIL}</code>
            </div>
            <div className="flex justify-between gap-3 mt-1">
              <span>Demo password</span>
              <code className="text-accent">{DEMO_PASS}</code>
            </div>
          </div>
        )}

        <p className="text-center text-sm text-text-muted mt-6">
          New here?{" "}
          <Link href="/register" className="text-accent hover:underline font-medium">
            Create an account
          </Link>
        </p>
        {!fakeData && (
          <p className="text-center text-xs text-text-dim mt-2">
            <code>FAKE_DATA=false</code> · production mode
          </p>
        )}
      </div>
    </div>
  );
}
