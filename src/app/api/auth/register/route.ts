import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  hashPassword,
  signJWT,
  generateId,
  hashIP,
  detectMaliciousInput,
} from "@/lib/security";
import { createSession, checkRateLimit, logAudit } from "@/lib/auth";
import { seedDemoWorkspace, isFakeData } from "@/lib/demo-data";
import { config, isAdminEmail } from "@/lib/config";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";

  try {
    // ── 1. Parse ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const email    = (body.email    ?? "").toString().toLowerCase().trim();
    const password = (body.password ?? "").toString();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    if (detectMaliciousInput(email)) {
      return NextResponse.json({ error: "Invalid input detected" }, { status: 400 });
    }

    // ── 2. Registration open? ──────────────────────────────────────────────
    if (!config.ALLOW_REGISTRATION) {
      const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
      if (count > 0) {
        return NextResponse.json({ error: "Registration is currently closed" }, { status: 403 });
      }
    }

    // ── 3. Rate limit ──────────────────────────────────────────────────────
    const rl = await checkRateLimit({
      key: `signup:ip:${hashIP(ip)}`,
      max: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many signups. Try again later." }, { status: 429 });
    }

    // ── 4. Password strength ───────────────────────────────────────────────
    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password must include uppercase, lowercase and a number" },
        { status: 400 }
      );
    }

    // ── 5. Duplicate check ─────────────────────────────────────────────────
    const existingRows = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const existing = existingRows[0];
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    // ── 6. Create user ─────────────────────────────────────────────────────
    const { hash, salt } = await hashPassword(password);
    const userId = generateId();

    await db.insert(users).values({
      id: userId,
      email,
      passwordHash: hash,
      passwordSalt: salt,
      emailVerified: false,
      failedAttempts: 0,
      createdAt: Date.now(),
    });

    // ── 7. Issue session ───────────────────────────────────────────────────
    const token = await signJWT({ sub: userId, email });
    await createSession(userId, email, token);

    // Fire-and-forget
    if (isFakeData()) {
      void seedDemoWorkspace(userId).catch((e) =>
        console.error("[demo seed]", e?.message)
      );
    }
    void logAudit({
      userId,
      action: "user.signup",
      targetType: "user",
      targetId: userId,
      ip,
      userAgent: req.headers.get("user-agent") ?? undefined,
    }).catch(() => {});

    return NextResponse.json(
      { success: true, user: { id: userId, email }, role: isAdminEmail(email) ? "admin" : "user" },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register route error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
