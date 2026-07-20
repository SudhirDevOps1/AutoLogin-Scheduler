"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KeyRound,
  Clock,
  FileText,
  Settings,
  LogOut,
  Shield,
  Cloud,
  Users,
  FlaskConical,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface Props {
  user: { id: string; email: string };
  isAdmin: boolean;
  demoMode: boolean;
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { href: "/dashboard/credentials", label: "Credentials", icon: KeyRound },
  { href: "/dashboard/schedules", label: "Schedules", icon: Clock },
  { href: "/dashboard/logs", label: "Login logs", icon: FileText },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardShell({ user, isAdmin, demoMode, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed lg:sticky top-16 lg:top-16 z-40 h-[calc(100vh-4rem)] w-64
          border-r border-border bg-bg-elev flex-shrink-0 flex flex-col
          transition-transform
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user.email}</div>
              <div className="text-xs text-text-dim flex items-center gap-1 mt-0.5">
                <Cloud className="w-3 h-3" />
                Your Cloudflare account
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {demoMode && (
            <div className="mx-1 mb-3 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2 flex items-center gap-2">
              <FlaskConical className="w-3.5 h-3.5 text-warning" />
              <div>
                <div className="text-[10px] font-semibold text-warning uppercase tracking-wider">FAKE_DATA mode</div>
                <div className="text-[10px] text-text-dim">Set FAKE_DATA=false for production</div>
              </div>
            </div>
          )}
          {[
            ...navItems,
            ...(isAdmin ? [{ href: "/dashboard/admin", label: "Admin panel", icon: Users }] : []),
          ].map((item) => {
            const active =
              item.end ? pathname === item.href : pathname.startsWith(item.href) && item.href !== "/dashboard";
            const isOverview = item.href === "/dashboard" && pathname === "/dashboard";
            const isActive = active || isOverview;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                  isActive
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-text-muted hover:text-text hover:bg-bg-soft"
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border space-y-0.5">
          <Link
            href="/docs"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-text hover:bg-bg-soft transition"
          >
            <FileText className="w-4 h-4" />
            <span>API Docs</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-text-muted hover:text-danger hover:bg-danger/5 transition text-left"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Mobile nav toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full bg-accent text-white shadow-lg flex items-center justify-center"
        aria-label="Toggle menu"
      >
        <LayoutDashboard className="w-5 h-5" />
      </button>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-7xl p-6 md:p-8">{children}</div>
      </main>
    </div>
  );
}
