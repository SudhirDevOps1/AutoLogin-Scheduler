"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function NavAuth() {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "guest" | "authenticated">("loading");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => {
        if (active) setState(response.ok ? "authenticated" : "guest");
      })
      .catch(() => active && setState("guest"));
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setState("guest");
    router.push("/login");
    router.refresh();
  }

  if (state === "loading") {
    return <div className="h-8 w-32 rounded-lg skeleton" aria-label="Checking session" />;
  }

  if (state === "authenticated") {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white hover:opacity-90 transition flex items-center gap-2"
        >
          <LayoutDashboard className="w-4 h-4" /> Dashboard
        </Link>
        <button
          onClick={logout}
          className="p-2 rounded-lg border border-border text-text-muted hover:text-danger hover:border-danger/30 transition"
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/login"
        className="px-4 py-1.5 text-sm font-medium rounded-lg border border-border hover:border-accent/50 hover:bg-bg-elev transition"
      >
        Sign in
      </Link>
      <Link
        href="/register"
        className="hidden sm:block px-4 py-1.5 text-sm font-medium rounded-lg bg-gradient-to-r from-accent to-accent-2 text-white hover:opacity-90 transition glow-purple"
      >
        Get started
      </Link>
    </div>
  );
}
