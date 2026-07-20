import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  credentials,
  schedules,
  loginLogs,
  auditLogs,
  sessions,
} from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth";
import { isFakeData } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

function isAdmin(email: string) {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail && email.toLowerCase() === adminEmail.toLowerCase());
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!isAdmin(auth.email)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const [
      userCount,
      credentialCount,
      scheduleCount,
      activeScheduleCount,
      logStats,
      activeSessionCount,
      recentUsers,
      recentAudits,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(credentials),
      db.select({ count: sql<number>`count(*)::int` }).from(schedules),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(schedules)
        .where(eq(schedules.enabled, true)),
      db.select({
        total: sql<number>`count(*)::int`,
        success: sql<number>`count(*) FILTER (WHERE ${loginLogs.success} = true)::int`,
        failed: sql<number>`count(*) FILTER (WHERE ${loginLogs.success} = false)::int`,
        avgDuration: sql<number>`coalesce(avg(${loginLogs.durationMs}), 0)::int`,
      }).from(loginLogs),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(sessions)
        .where(eq(sessions.revoked, false)),
      db
        .select({
          id: users.id,
          email: users.email,
          emailVerified: users.emailVerified,
          failedAttempts: users.failedAttempts,
          lockedUntil: users.lockedUntil,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(10),
      db
        .select({
          id: auditLogs.id,
          userId: auditLogs.userId,
          action: auditLogs.action,
          targetType: auditLogs.targetType,
          targetId: auditLogs.targetId,
          createdAt: auditLogs.createdAt,
          email: users.email,
        })
        .from(auditLogs)
        .innerJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.createdAt))
        .limit(12),
    ]);

    const logs = logStats[0] ?? { total: 0, success: 0, failed: 0, avgDuration: 0 };

    return NextResponse.json({
      mode: isFakeData() ? "beta-demo" : "production",
      admin: { email: auth.email },
      stats: {
        users: userCount[0]?.count || 0,
        credentials: credentialCount[0]?.count || 0,
        schedules: scheduleCount[0]?.count || 0,
        activeSchedules: activeScheduleCount[0]?.count || 0,
        loginRuns: logs.total || 0,
        successRuns: logs.success || 0,
        failedRuns: logs.failed || 0,
        successRate: logs.total ? Math.round((logs.success / logs.total) * 100) : 100,
        avgDuration: logs.avgDuration || 0,
        activeSessions: activeSessionCount[0]?.count || 0,
      },
      recentUsers,
      recentAudits,
      services: {
        database: { configured: Boolean(process.env.DATABASE_URL), label: "PostgreSQL + Drizzle" },
        auth: { configured: Boolean(process.env.AUTH_SECRET || process.env.JWT_SECRET), label: "JWT + PBKDF2" },
        email: {
          configured: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
          label: process.env.RESEND_API_KEY ? "Resend" : process.env.SMTP_HOST ? "SMTP" : "Not configured",
        },
        storage: {
          configured: Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET_NAME),
          label: process.env.S3_ENDPOINT ? "S3-compatible" : "D1/DB only",
        },
        browser: {
          configured: false,
          label: isFakeData() ? "Simulated in beta" : "Cloudflare binding required",
        },
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Admin overview error:", error);
    return NextResponse.json({ error: "Unable to load admin overview" }, { status: 500 });
  }
}
