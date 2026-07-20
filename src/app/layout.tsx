import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Link from "next/link";
import { Shield, Cloud } from "lucide-react";
import { NavAuth } from "@/components/nav-auth";

export const metadata: Metadata = {
  title: "AutoLogin Scheduler — Serverless Auto-Login on Cloudflare",
  description:
    "Schedule auto-login to any website. Encrypted credentials, Cloudflare Cron + Browser Rendering, R2/S3 optional, self-host on your account.",
  keywords: "auto login, scheduler, cloudflare workers, puppeteer, d1, browser rendering",
  icons: {
    icon: [{ url: "/logo.svg", type: "image/svg+xml" }, { url: "/favicon.png", type: "image/png", sizes: "32x32" }],
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "AutoLogin Scheduler — Serverless Auto-Login",
    description: "Schedule auto-login to any website. Encrypted credentials, Cloudflare Cron + Browser Rendering.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-bg text-text antialiased">
        <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-lg">
          <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-success border-2 border-bg pulse-dot text-success" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-semibold tracking-tight">AutoLogin</span>
                <span className="text-[10px] text-text-dim tracking-wider uppercase">Scheduler</span>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/docs"
                className="px-3 py-1.5 text-sm text-text-muted hover:text-text transition"
              >
                Docs
              </Link>
              <Link
                href="/deploy"
                className="px-3 py-1.5 text-sm text-text-muted hover:text-text transition"
              >
                Deploy
              </Link>
              <NavAuth />
            </div>
          </div>
        </nav>
        {children}
        <footer className="border-t border-border mt-24">
          <div className="mx-auto max-w-7xl px-6 py-10 text-sm text-text-dim flex flex-wrap justify-between gap-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              <span>Runs on Cloudflare Workers · D1 · Browser Rendering</span>
            </div>
            <div className="flex items-center gap-4">
              <span>Privacy-first</span>
              <span>·</span>
              <span>Self-hostable</span>
              <span>·</span>
              <span>MIT Licensed</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
