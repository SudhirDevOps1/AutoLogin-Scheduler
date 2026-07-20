// @ts-nocheck
import "./shims";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initD1 } from "../db/index";
import { requestStorage } from "../lib/auth";

// Import Next.js route handlers
import { GET as getHealth } from "../app/api/health/route";
import { GET as getVersion } from "../app/api/version/route";
import { POST as postRegister } from "../app/api/auth/register/route";
import { POST as postLogin } from "../app/api/auth/login/route";
import { POST as postLogout } from "../app/api/auth/logout/route";
import { GET as getMe } from "../app/api/auth/me/route";
import { GET as getCheckEmail } from "../app/api/auth/check-email/route";
import { GET as getCredentials, POST as postCredentials, PUT as putCredentials, DELETE as deleteCredentials } from "../app/api/credentials/route";
import { GET as getRevealCredential } from "../app/api/credentials/reveal/route";
import { GET as getSchedules, POST as postSchedules, PUT as putSchedules, DELETE as deleteSchedules } from "../app/api/schedules/route";
import { GET as getLogs } from "../app/api/logs/route";
import { POST as postLogsManual } from "../app/api/logs/manual/route";
import { POST as postTrigger, PUT as putTrigger } from "../app/api/trigger/route";
import { GET as getAdminOverview } from "../app/api/admin/overview/route";
import { GET as getSettings, POST as postSettings } from "../app/api/settings/route";

export interface Env {
  DB: D1Database;
  AUTH_SECRET: string;
  JWT_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ALLOW_REGISTRATION?: string;
  FAKE_DATA?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS — only allow same origin + Cloudflare workers subdomain
app.use("*", cors({
  origin: [
    "https://autologin-scheduler.sudhirdevops1.workers.dev",
    "http://localhost:3000",
    "http://localhost:8787",
  ],
  credentials: true,
  allowHeaders: ["Content-Type", "Authorization", "Cookie"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

// ─── Security Headers Middleware ─────────────────────────────────────────────
// Adds OWASP-recommended headers on every response
app.use("*", async (c, next) => {
  await next();
  // Prevent clickjacking
  c.res.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME-type sniffing
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  // No referrer leaked to 3rd-party sites
  c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Disable dangerous browser features
  c.res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  // HSTS — 1 year, includeSubDomains
  c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  // Content Security Policy
  c.res.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://prismanalytics.sudhirdevops1.workers.dev",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://prismanalytics.sudhirdevops1.workers.dev https://apnaform.sudhirdevops1.workers.dev",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://apnaform.sudhirdevops1.workers.dev",
    ].join("; ")
  );
  // Remove server fingerprinting
  c.res.headers.delete("X-Powered-By");
  c.res.headers.delete("Server");
});


// Populate process.env and initialize D1 Database
app.use("*", async (c, next) => {
  if (c.env) {
    for (const [key, value] of Object.entries(c.env)) {
      if (typeof value === "string") {
        process.env[key] = value;
      }
    }
  }
  initD1(c.env.DB);
  await next();
});

// Helper to wrap Next.js handlers
async function wrap(handler: Function, c: any) {
  try {
    const responseCookies: string[] = [];
    const response = await requestStorage.run(
      { headers: c.req.raw.headers, responseCookies },
      async () => {
        return await handler(c.req.raw);
      }
    );

    if (responseCookies.length > 0 && response) {
      const newHeaders = new Headers(response.headers);
      responseCookies.forEach(cookie => {
        newHeaders.append("Set-Cookie", cookie);
      });
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
    }

    return response;
  } catch (err) {
    console.error("Handler error:", err);
    return c.json({ error: "Internal server error" }, 500);
  }
}

// ─── Health / Version ─────────────────────────────────────────────────────
app.get("/api/health", (c) => wrap(getHealth, c));
app.get("/api/version", (c) => wrap(getVersion, c));

// ─── Auth ─────────────────────────────────────────────────────────────────
app.post("/api/auth/register", (c) => wrap(postRegister, c));
app.post("/api/auth/login", (c) => wrap(postLogin, c));
app.post("/api/auth/logout", (c) => wrap(postLogout, c));
app.get("/api/auth/me", (c) => wrap(getMe, c));
app.get("/api/auth/check-email", (c) => wrap(getCheckEmail, c));

// ─── Credentials ──────────────────────────────────────────────────────────
app.get("/api/credentials", (c) => wrap(getCredentials, c));
app.post("/api/credentials", (c) => wrap(postCredentials, c));
app.put("/api/credentials", (c) => wrap(putCredentials, c));
app.delete("/api/credentials", (c) => wrap(deleteCredentials, c));
app.get("/api/credentials/reveal", (c) => wrap(getRevealCredential, c));

// ─── Schedules ────────────────────────────────────────────────────────────
app.get("/api/schedules", (c) => wrap(getSchedules, c));
app.post("/api/schedules", (c) => wrap(postSchedules, c));
app.put("/api/schedules", (c) => wrap(putSchedules, c));
app.delete("/api/schedules", (c) => wrap(deleteSchedules, c));

// ─── Logs ─────────────────────────────────────────────────────────────────
app.get("/api/logs", (c) => wrap(getLogs, c));
app.post("/api/logs/manual", (c) => wrap(postLogsManual, c));

// ─── Trigger / Cron ───────────────────────────────────────────────────────
app.post("/api/trigger", (c) => wrap(postTrigger, c));
app.put("/api/trigger", (c) => wrap(putTrigger, c));
// ─── Settings ─────────────────────────────────────────────────────────────
app.get("/api/settings", (c) => wrap(getSettings, c));
app.post("/api/settings", (c) => wrap(postSettings, c));
// ─── Admin Overview ───────────────────────────────────────────────────────
app.get("/api/admin/overview", (c) => wrap(getAdminOverview, c));

// Security headers to inject on every response (API + static assets)
const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options":           "DENY",
  "X-Content-Type-Options":    "nosniff",
  "Referrer-Policy":           "strict-origin-when-cross-origin",
  "Permissions-Policy":        "camera=(), microphone=(), geolocation=(), payment=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://prismanalytics.sudhirdevops1.workers.dev",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://prismanalytics.sudhirdevops1.workers.dev https://apnaform.sudhirdevops1.workers.dev",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://apnaform.sudhirdevops1.workers.dev",
  ].join("; "),
};

function injectSecurityHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newHeaders.set(key, value);
  }
  newHeaders.delete("X-Powered-By");
  newHeaders.delete("Server");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

// ─── Scheduled Cron Handler ──────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Run Hono app for all requests
    const response = await app.fetch(request, env, ctx);

    // Inject security headers on every response (API + static asset fallthrough)
    return injectSecurityHeaders(response);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    console.log("[Worker Cron] Triggered scheduled event:", event.scheduledTime);
    initD1(env.DB);
    if (env) {
      for (const [key, value] of Object.entries(env)) {
        if (typeof value === "string") {
          process.env[key] = value;
        }
      }
    }
    const cronSecret = env.AUTH_SECRET;
    const req = new Request("http://localhost/api/trigger", {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${cronSecret}`,
      },
    });
    try {
      const response = await putTrigger(req);
      const data = await response.json();
      console.log("[Worker Cron] Trigger result:", JSON.stringify(data));
    } catch (err) {
      console.error("[Worker Cron] Trigger failed:", err);
    }
  },
};
