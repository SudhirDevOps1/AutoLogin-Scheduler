// @ts-nocheck
import "./shims";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { initD1 } from "../db/index";

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
import { POST as postTrigger, PUT as putTrigger } from "../app/api/trigger/route";
import { GET as getDemo, POST as postDemo } from "../app/api/demo/route";
import { GET as getAdminOverview } from "../app/api/admin/overview/route";

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

// Enable CORS
app.use("*", cors({ origin: "*", credentials: true }));

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
    return await handler(c.req.raw);
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

// ─── Trigger / Cron ───────────────────────────────────────────────────────
app.post("/api/trigger", (c) => wrap(postTrigger, c));
app.put("/api/trigger", (c) => wrap(putTrigger, c));

// ─── Demo ─────────────────────────────────────────────────────────────────
app.get("/api/demo", (c) => wrap(getDemo, c));
app.post("/api/demo", (c) => wrap(postDemo, c));

// ─── Admin Overview ───────────────────────────────────────────────────────
app.get("/api/admin/overview", (c) => wrap(getAdminOverview, c));

// ─── Scheduled Cron Handler ──────────────────────────────────────────────
export default {
  fetch: app.fetch,
  async scheduled(event, env, ctx) {
    console.log("[Worker Cron] Triggered scheduled event:", event.scheduledTime);
    // Directly call the trigger PUT handler by mocking a Request
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
