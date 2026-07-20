"use client";

import { useState, FormEvent, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, AlertCircle, CheckCircle2, X, FlaskConical, WandSparkles, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailValid, setEmailValid] = useState<boolean | null>(null);
  const [emailMsg, setEmailMsg] = useState("");

  let emailTimer: ReturnType<typeof setTimeout>;
  async function handleEmailCheck(e: string) {
    setEmail(e);
    if (emailTimer) clearTimeout(emailTimer);
    if (e.length < 5 || !e.includes("@")) { setEmailValid(null); setEmailMsg(""); return; }
    emailTimer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(e)}`);
        const data = await res.json();
        setEmailValid(data.format && !data.disposable && data.mx);
        if (!data.format) setEmailMsg("Invalid email format");
        else if (data.disposable) setEmailMsg("Disposable email not allowed");
        else if (!data.mx) setEmailMsg(data.error || "Domain has no email server");
        else setEmailMsg("✓ Valid email");
      } catch { setEmailValid(null); setEmailMsg(""); }
      setCheckingEmail(false);
    }, 600);
  }

  const strength = useMemo(() => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  }, [password]);

  const strengthLabel = ["Too short", "Weak", "Fair", "Good", "Strong", "Very strong", "Excellent"][strength] || "";
  const strengthColor = ["bg-danger", "bg-danger", "bg-warning", "bg-warning", "bg-accent", "bg-success", "bg-success"][strength] || "";

  function generateTestAccount() {
    const suffix = Date.now().toString().slice(-6);
    setEmail(`developer.${suffix}@example.com`);
    setPassword(`Beta${suffix}!Test`);
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center mb-4 glow-purple">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-warning/30 bg-warning/10 text-warning font-semibold">Beta</span>
            <span className="text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border border-success/30 bg-success/10 text-success font-semibold">Registration open</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="text-text-muted mt-2 text-sm">Get your own isolated developer workspace</p>
        </div>

        <div className="mb-4 rounded-xl border border-accent/25 bg-accent/5 p-4 flex items-start gap-3">
          <FlaskConical className="w-5 h-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="text-sm font-semibold">Testing registration?</div>
            <p className="text-xs text-text-muted mt-1">Signup creates 6 fake credentials, schedules and 42 login events automatically.</p>
            <button type="button" onClick={generateTestAccount} className="mt-2 text-xs text-accent hover:underline flex items-center gap-1.5">
              <WandSparkles className="w-3.5 h-3.5" /> Generate unique test account
            </button>
          </div>
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
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => handleEmailCheck(e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border text-sm ${
                  emailValid === null ? "border-border bg-bg" :
                  emailValid ? "border-success/50 bg-success/5" : "border-danger/50 bg-danger/5"
                }`}
                placeholder="you@example.com"
              />
              {checkingEmail && <Loader2 className="absolute right-3 top-3 w-4 h-4 animate-spin text-text-dim" />}
              {emailValid === true && !checkingEmail && <CheckCircle2 className="absolute right-3 top-3 w-4 h-4 text-success" />}
              {emailValid === false && !checkingEmail && <X className="absolute right-3 top-3 w-4 h-4 text-danger" />}
            </div>
            {emailMsg && (
              <p className={`text-xs mt-1 ${emailValid ? "text-success" : "text-danger"}`}>{emailMsg}</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-text-muted block mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-border bg-bg text-sm"
              placeholder="At least 8 characters"
            />
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 h-1">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full ${i < strength ? strengthColor : "bg-border"}`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span className={`flex items-center gap-1 ${strength >= 4 ? "text-success" : strength >= 2 ? "text-warning" : "text-danger"}`}>
                    {strength >= 4 ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                    {strengthLabel}
                  </span>
                  <span className="text-text-dim">
                    {password.length} chars
                  </span>
                </div>
              </div>
            )}
            <ul className="mt-2 text-xs text-text-dim space-y-1">
              <li className="flex items-center gap-1.5">
                {password.length >= 8 ? <CheckCircle2 className="w-3 h-3 text-success" /> : <X className="w-3 h-3 text-text-dim" />}
                At least 8 characters
              </li>
              <li className="flex items-center gap-1.5">
                {/[A-Z]/.test(password) && /[a-z]/.test(password) ? <CheckCircle2 className="w-3 h-3 text-success" /> : <X className="w-3 h-3 text-text-dim" />}
                Upper and lowercase letters
              </li>
              <li className="flex items-center gap-1.5">
                {/[0-9]/.test(password) ? <CheckCircle2 className="w-3 h-3 text-success" /> : <X className="w-3 h-3 text-text-dim" />}
                At least one number
              </li>
            </ul>
          </div>
          <button
            type="submit"
            disabled={loading || emailValid === false}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="spinner" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
