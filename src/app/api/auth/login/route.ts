import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  signJWT,
  hashIP,
  hashEmail,
  detectMaliciousInput,
  generateId,
  hashPassword,
  verifyPassword,
} from "@/lib/security";
import {
  createSession,
  checkRateLimit,
  logAudit,
  checkAccountLockout,
  recordFailedLogin,
  recordSuccessfulLogin,
} from "@/lib/auth";
import { seedDemoWorkspace, isFakeData } from "@/lib/demo-data";
import { config, isAdminEmail } from "@/lib/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  try {
    // ── 1. Parse & validate ────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email = (body.email ?? "").toString().toLowerCase().trim();
    const password = (body.password ?? "").toString();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    if (detectMaliciousInput(email)) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // ── 2. Admin login from config (bypasses DB + rate-limit) ──────────────
    if (isAdminEmail(email) && password === config.ADMIN_PASSWORD) {
      // Ensure admin user row exists
      let adminRows = await db.select().from(users).where(eq(users.email, config.ADMIN_EMAIL.toLowerCase())).limit(1);
      let adminUser = adminRows[0];

      if (!adminUser) {
        const { hash, salt } = await hashPassword(config.ADMIN_PASSWORD);
        const [inserted] = await db
          .insert(users)
          .values({
            id: generateId(),
            email: config.ADMIN_EMAIL.toLowerCase(),
            passwordHash: hash,
            passwordSalt: salt,
            emailVerified: true,
            failedAttempts: 0,
            createdAt: Date.now(),
          })
          .returning();
        adminUser = inserted;
      }

      if (!adminUser) {
        return NextResponse.json({ error: "Could not provision admin user" }, { status: 500 });
      }

      const token = await signJWT({ sub: adminUser.id, email: adminUser.email });
      await createSession(adminUser.id, adminUser.email, token);

      // Fire-and-forget: demo seed + audit (never blocks login)
      if (isFakeData()) {
        void seedDemoWorkspace(adminUser.id).catch(() => {});
      }
      void logAudit({
        userId: adminUser.id,
        action: "user.login",
        targetType: "user",
        targetId: adminUser.id,
        ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        user: { id: adminUser.id, email: adminUser.email },
        role: "admin",
      });
    }

    // ── 3. Rate limiting ───────────────────────────────────────────────────
    const ipRl = await checkRateLimit({
      key: `login:ip:${hashIP(ip)}`,
      max: 20,
      windowMs: 15 * 60 * 1000,
    });
    if (!ipRl.allowed) {
      return NextResponse.json({ error: "Too many login attempts. Try again later." }, { status: 429 });
    }

    const emailRl = await checkRateLimit({
      key: `login:email:${hashEmail(email)}`,
      max: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!emailRl.allowed) {
      return NextResponse.json({ error: "Too many login attempts for this email." }, { status: 429 });
    }

    // ── 4. Account lockout ─────────────────────────────────────────────────
    const lockout = await checkAccountLockout(email);
    if (lockout.locked) {
      const mins = Math.ceil((lockout.lockedUntil! - Date.now()) / 60000);
      return NextResponse.json({ error: `Account locked. Try again in ${mins} minutes.` }, { status: 423 });
    }

    // ── 5. Load user ───────────────────────────────────────────────────────
    const userRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const user = userRows[0];

    if (!user) {
      await hashPassword(password).catch(() => {}); // timing-safe
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // ── 6. Verify password ─────────────────────────────────────────────────
    const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
    if (!valid) {
      await recordFailedLogin(email);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // ── 7. Success ─────────────────────────────────────────────────────────
    await recordSuccessfulLogin(user.id);
    const token = await signJWT({ sub: user.id, email: user.email });
    await createSession(user.id, user.email, token);

    if (isFakeData()) {
      void seedDemoWorkspace(user.id).catch(() => {});
    }
    void logAudit({
      userId: user.id,
      action: "user.login",
      targetType: "user",
      targetId: user.id,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email },
      role: isAdminEmail(user.email) ? "admin" : "user",
    });
  } catch (err) {
    console.error("[login route error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
