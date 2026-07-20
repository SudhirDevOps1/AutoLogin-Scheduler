"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export function ContactForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // Honeypot field
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (website) {
      // If honeypot field is filled, silently discard (bot protection)
      setStatus("success");
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("https://apnaform.sudhirdevops1.workers.dev/api/submit/endpoint_mhvmLo4MCXHO_5UImnjdulmV", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message }),
      });

      if (res.ok) {
        setStatus("success");
        setEmail("");
        setMessage("");
      } else {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.message || "Failed to submit response.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error occurred. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-md mx-auto p-8 bg-slate-900 border border-success/30 rounded-2xl text-center space-y-3 shadow-xl">
        <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
        <h3 className="text-lg font-bold text-white">Message Sent!</h3>
        <p className="text-slate-400 text-sm">
          Thanks! Your response has been received successfully.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg transition"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 shadow-xl text-left"
    >
      {status === "error" && (
        <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-xs text-danger flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email</label>
        <input
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter email"
          disabled={status === "submitting"}
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition disabled:opacity-50"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Message</label>
        <textarea
          name="message"
          required
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message here..."
          rows={4}
          disabled={status === "submitting"}
          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition disabled:opacity-50"
        ></textarea>
      </div>
      {/* Honeypot Bot Trap */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ display: "none" }}
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-xl hover:from-cyan-400 hover:to-blue-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {status === "submitting" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Sending...
          </>
        ) : (
          "Send Message"
        )}
      </button>
    </form>
  );
}
