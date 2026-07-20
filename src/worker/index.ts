// @ts-nocheck — Cloudflare Worker file. Not compiled by Next.js.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { jwt } from "hono/jwt";
import { drizzle } from "drizzle-orm/d1";

// ─── Bindings ─────────────────────────────────────────────────────────────
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
  S3_ENDPOINT?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_BUCKET_NAME?: string;
  S3_REGION?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ─── CORS ─────────────────────────────────────────────────────────────────
app.use("*", cors({ origin: "*", credentials: true }));

// ─── Health ───────────────────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ ok: true, version: "1.0.0" }));

// ─── Auth: Register ───────────────────────────────────────────────────────
app.post("/api/auth/register", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    if (!email || !password) return c.json({ error: "Email and password required" }, 400);
    // PBKDF2 + JWT + Session creation
    return c.json({ success: true, user: { id: "", email } }, 201);
  } catch { return c.json({ error: "Internal error" }, 500); }
});

// ─── Auth: Login ──────────────────────────────────────────────────────────
app.post("/api/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;

    // Admin env bypass
    const adminEmail = c.env.ADMIN_EMAIL?.toLowerCase();
    const adminPass  = c.env.ADMIN_PASSWORD;
    if (adminEmail && adminPass && email?.toLowerCase() === adminEmail && password === adminPass) {
      return c.json({ success: true, user: { id: "admin", email: adminEmail }, role: "admin" });
    }

    // DB lookup + verify + session
    // (Full implementation uses Drizzle D1 queries — see src/worker/routes/ for production)
    return c.json({ error: "Invalid credentials" }, 401);
  } catch { return c.json({ error: "Internal error" }, 500); }
});

// ─── Auth: Me / Logout ────────────────────────────────────────────────────
app.get("/api/auth/me", (c) => c.json({ user: null, stats: {} }));
app.post("/api/auth/logout", (c) => c.json({ success: true }));

// ─── Credentials ──────────────────────────────────────────────────────────
app.get("/api/credentials", (c) => c.json({ credentials: [] }));
app.post("/api/credentials", async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, credential: { id: "", ...body } }, 201);
});
app.put("/api/credentials", async (c) => c.json({ success: true }));
app.delete("/api/credentials", (c) => c.json({ success: true }));

// ─── Schedules ────────────────────────────────────────────────────────────
app.get("/api/schedules", (c) => c.json({ schedules: [] }));
app.post("/api/schedules", async (c) => {
  const body = await c.req.json();
  return c.json({ success: true, schedule: { id: "", body } }, 201);
});
app.put("/api/schedules", async (c) => c.json({ success: true }));
app.delete("/api/schedules", (c) => c.json({ success: true }));

// ─── Logs ─────────────────────────────────────────────────────────────────
app.get("/api/logs", (c) => c.json({ logs: [], pagination: { page: 1, pageSize: 25, total: 0, totalPages: 0 } }));

// ─── Trigger ──────────────────────────────────────────────────────────────
app.post("/api/trigger", async (c) => c.json({ success: true, log: { id: "" } }));

// ─── Static Assets / Dashboard SPA ────────────────────────────────────────
// In production, deploy with `wrangler deploy --assets dist/`
// This serves the built Next.js static export as the SPA.

export default app;
