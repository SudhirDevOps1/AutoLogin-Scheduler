import { cookies } from "next/headers";
import { db } from "@/db";
import { users, sessions, auditLogs, rateLimits } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import {
  verifyJWT,
  hashToken,
  generateId,
  hashIP,
  verifyPassword,
} from "./security";

// ─── Types ────────────────────────────────────────────────────────────────
export interface AuthContext {
  userId: string;
  email: string;
  jti: string;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

// ─── Cookie ───────────────────────────────────────────────────────────────
const SESSION_COOKIE = "autologin_session";
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

// ─── Auth context ─────────────────────────────────────────────────────────
export async function getAuth(): Promise<AuthContext | null> {
  try {
    const jar    = await cookies();
    const token  = jar.get(SESSION_COOKIE)?.value;
    if (!token) return null;

    const payload = await verifyJWT(token);
    if (!payload?.jti || !payload?.sub) return null;

    const tokenHash = hashToken(token);
    const session = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.tokenHash, tokenHash), eq(sessions.revoked, false)))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!session) return null;
    if (session.expiresAt < Date.now()) {
      await db.update(sessions).set({ revoked: true }).where(eq(sessions.id, session.id));
      return null;
    }

    return { userId: payload.sub, email: payload.email, jti: payload.jti };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthContext> {
  const auth = await getAuth();
  if (!auth) throw new AuthError("Unauthorized", 401);
  return auth;
}

// ─── Session management ───────────────────────────────────────────────────
export async function createSession(userId: string, email: string, token: string) {
  const tokenHash = hashToken(token);
  const now       = Date.now();
  await db.insert(sessions).values({
    id:        generateId(),
    userId,
    tokenHash,
    revoked:   false,
    expiresAt: now + COOKIE_MAX_AGE * 1000,
    createdAt: now,
  });
  await setSessionCookie(token);
}

export async function revokeSession(token: string) {
  const tokenHash = hashToken(token);
  await db
    .update(sessions)
    .set({ revoked: true })
    .where(eq(sessions.tokenHash, tokenHash));
}

// ─── Rate limiting (DB-backed, upsert pattern) ────────────────────────────
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export async function checkRateLimit(config: {
  key: string;
  max: number;
  windowMs: number;
}): Promise<RateLimitResult> {
  const now       = Date.now();
  const windowEnd = now + config.windowMs;

  // Use raw select to avoid relational query issues
  const rows = await db
    .select()
    .from(rateLimits)
    .where(eq(rateLimits.key, config.key))
    .limit(1);
  const existing = rows[0];

  if (!existing || existing.windowEnd < now) {
    // Upsert: reset window
    await db
      .insert(rateLimits)
      .values({ key: config.key, count: 1, windowEnd })
      .onConflictDoUpdate({ target: rateLimits.key, set: { count: 1, windowEnd } });
    return { allowed: true, remaining: config.max - 1, resetAt: windowEnd };
  }

  if (existing.count >= config.max) {
    return { allowed: false, remaining: 0, resetAt: existing.windowEnd };
  }

  await db
    .update(rateLimits)
    .set({ count: sql`${rateLimits.count} + 1` })
    .where(eq(rateLimits.key, config.key));

  return {
    allowed: true,
    remaining: config.max - existing.count - 1,
    resetAt: existing.windowEnd,
  };
}

// ─── Account lockout ──────────────────────────────────────────────────────
const LOCKOUT_THRESHOLD  = 5;
const LOCKOUT_DURATION   = 15 * 60 * 1000;

export async function checkAccountLockout(
  email: string
): Promise<{ locked: boolean; lockedUntil?: number }> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];

  if (!user) return { locked: false };

  if (user.lockedUntil && user.lockedUntil > Date.now()) {
    return { locked: true, lockedUntil: user.lockedUntil };
  }
  if (user.lockedUntil && user.lockedUntil <= Date.now()) {
    await db
      .update(users)
      .set({ lockedUntil: null, failedAttempts: 0 })
      .where(eq(users.id, user.id));
  }
  return { locked: false };
}

export async function recordFailedLogin(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];
  if (!user) return;

  const newCount   = (user.failedAttempts || 0) + 1;
  const lockedUntil =
    newCount >= LOCKOUT_THRESHOLD ? Date.now() + LOCKOUT_DURATION : null;

  await db
    .update(users)
    .set({ failedAttempts: newCount, lockedUntil })
    .where(eq(users.id, user.id));
}

export async function recordSuccessfulLogin(userId: string) {
  await db
    .update(users)
    .set({ failedAttempts: 0, lockedUntil: null })
    .where(eq(users.id, userId));
}

// ─── Audit log ────────────────────────────────────────────────────────────
export async function logAudit(params: {
  userId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    id:         generateId(),
    userId:     params.userId,
    action:     params.action,
    targetType: params.targetType,
    targetId:   params.targetId,
    ipHash:     params.ip ? hashIP(params.ip) : null,
    userAgent:  params.userAgent?.slice(0, 200),
    metadata:   params.metadata ? JSON.stringify(params.metadata) : null,
    createdAt:  Date.now(),
  });
}

// ─── Authenticate user (for normal login flow) ────────────────────────────
export async function authenticateUser(
  email: string,
  password: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  const user = rows[0];

  if (!user) return { success: false, error: "Invalid credentials" };

  const lockout = await checkAccountLockout(email);
  if (lockout.locked) {
    return {
      success: false,
      error: `Account locked until ${new Date(lockout.lockedUntil!).toLocaleTimeString()}`,
    };
  }

  const valid = await verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!valid) {
    await recordFailedLogin(email);
    return { success: false, error: "Invalid credentials" };
  }

  await recordSuccessfulLogin(user.id);
  return { success: true, userId: user.id };
}
