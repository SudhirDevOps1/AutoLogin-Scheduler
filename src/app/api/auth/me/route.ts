import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { db } from "@/db";
import { users, credentials, schedules, loginLogs } from "@/db/schema";
import { eq, sql, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await getAuth();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRows = await db.select().from(users).where(eq(users.id, auth.userId)).limit(1);
    const user = userRows[0];
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Stats
    const [credCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(credentials)
      .where(eq(credentials.userId, auth.userId));

    const [scheduleCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schedules)
      .innerJoin(credentials, eq(schedules.credentialId, credentials.id))
      .where(eq(credentials.userId, auth.userId));

    const [activeSchedules] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schedules)
      .innerJoin(credentials, eq(schedules.credentialId, credentials.id))
      .where(
        and(
          eq(credentials.userId, auth.userId),
          eq(schedules.enabled, true)
        )
      );

    // Recent logs (last 5)
    const recentLogs = await db
      .select({
        id: loginLogs.id,
        siteUrl: credentials.siteUrl,
        name: credentials.name,
        success: loginLogs.success,
        runTime: loginLogs.runTime,
        errorMessage: loginLogs.errorMessage,
      })
      .from(loginLogs)
      .innerJoin(credentials, eq(loginLogs.credentialId, credentials.id))
      .where(eq(credentials.userId, auth.userId))
      .orderBy(sql`${loginLogs.runTime} DESC`)
      .limit(5);

    // Success rate (last 24h)
    const [stats24h] = await db
      .select({
        total: sql<number>`count(*)::int`,
        success: sql<number>`count(*) FILTER (WHERE ${loginLogs.success} = true)::int`,
      })
      .from(loginLogs)
      .innerJoin(credentials, eq(loginLogs.credentialId, credentials.id))
      .where(
        and(
          eq(credentials.userId, auth.userId),
          sql`${loginLogs.runTime} > ${Date.now() - 24 * 60 * 60 * 1000}`
        )
      );

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      stats: {
        totalCredentials: credCount?.count || 0,
        totalSchedules: scheduleCount?.count || 0,
        activeSchedules: activeSchedules?.count || 0,
        logins24h: stats24h?.total || 0,
        successRate24h:
          stats24h?.total && stats24h.total > 0
            ? Math.round((stats24h.success / stats24h.total) * 100)
            : 100,
      },
      recentLogs,
    });
  } catch (err) {
    console.error("Auth me error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
