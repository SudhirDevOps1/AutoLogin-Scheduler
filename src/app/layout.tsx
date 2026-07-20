import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Link from "next/link";
import { Cloud } from "lucide-react";
import { NavAuth } from "@/components/nav-auth";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  metadataBase: new URL("https://autologin-scheduler.sudhirdevops1.workers.dev"),
  title: "AutoLogin Scheduler — Serverless Auto-Login on Cloudflare",
  description:
    "Schedule auto-login to any website. Encrypted credentials, Cloudflare Cron + Browser Rendering, R2/S3 optional, self-host on your account.",
  keywords: "auto login, scheduler, cloudflare workers, puppeteer, d1, browser rendering",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon.png",
  },
  openGraph: {
    title: "AutoLogin Scheduler — Serverless Auto-Login",
    description: "Schedule auto-login to any website. Encrypted credentials, Cloudflare Cron + Browser Rendering.",
    images: ["/logo.png"],
    url: "https://autologin-scheduler.sudhirdevops1.workers.dev",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AutoLogin Scheduler — Serverless Auto-Login",
    description: "Schedule auto-login to any website. Encrypted credentials, Cloudflare Cron + Browser Rendering.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function(){
            var id='pa_003dd08ece6f412f9b07', url='https://prismanalytics.sudhirdevops1.workers.dev/api/track';
            var sid=sessionStorage.getItem('pa_sid')||(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
            sessionStorage.setItem('pa_sid',sid);
            function t(e,d){
              var q=new URLSearchParams(location.search);
              navigator.sendBeacon(url,JSON.stringify({
                site_id:id,
                pathname:location.pathname,
                referrer:document.referrer,
                screen_size:screen.width+'x'+screen.height,
                session_id:sid,
                event_name:e||'pageview',
                event_data:d,
                utm_source:q.get('utm_source'),
                utm_medium:q.get('utm_medium'),
                utm_campaign:q.get('utm_campaign')
              }));
            }
            window.prism=t;
            t();
            var p=location.pathname;
            setInterval(function(){
              if(p!=location.pathname){
                p=location.pathname;
                t();
              }
            },500);
          })();
        ` }} />
      </head>
      <body className="bg-bg text-text antialiased">
        <nav className="sticky top-0 z-50 border-b border-border bg-bg/80 backdrop-blur-lg">
          <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
            <Logo size={36} />
            <div className="flex items-center gap-2">
              <Link href="/docs" className="px-3 py-1.5 text-sm text-text-muted hover:text-text transition">
                Docs
              </Link>
              <Link href="/deploy" className="px-3 py-1.5 text-sm text-text-muted hover:text-text transition">
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
              <span>Runs on Cloudflare Workers · D1 · Browser Rendering · by Sudhir Singh</span>
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
