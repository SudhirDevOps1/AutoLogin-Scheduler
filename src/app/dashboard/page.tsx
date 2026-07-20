import { db } from "@/db";
import { credentials, schedules, loginLogs } from "@/db/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { getAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OverviewClient } from "./overview-client";
import { config, isAdminEmail } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function DashboardOverview() {
  const auth = await getAuth();
  if (!auth) redirect("/login");

  // Fetch user's data
  const userCredentials = await db
    .select()
    .from(credentials)
    .where(eq(credentials.userId, auth.userId));

  const userSchedules = await db
    .select({
      id: schedules.id,
      credentialId: schedules.credentialId,
      cronExpr: schedules.cronExpr,
      nextRun: schedules.nextRun,
      enabled: schedules.enabled,
      credentialName: credentials.name,
      siteUrl: credentials.siteUrl,
    })
    .from(schedules)
    .innerJoin(credentials, eq(schedules.credentialId, credentials.id))
    .where(eq(credentials.userId, auth.userId))
    .orderBy(schedules.nextRun);

  const recentLogs = await db
    .select({
      id: loginLogs.id,
      runTime: loginLogs.runTime,
      durationMs: loginLogs.durationMs,
      success: loginLogs.success,
      errorMessage: loginLogs.errorMessage,
      credentialName: credentials.name,
      siteUrl: credentials.siteUrl,
    })
    .from(loginLogs)
    .innerJoin(credentials, eq(loginLogs.credentialId, credentials.id))
    .where(eq(credentials.userId, auth.userId))
    .orderBy(desc(loginLogs.runTime))
    .limit(10);

  // Stats
  const [totalStats] = await db
    .select({
      total: sql<number>`count(*)::int`,
      success: sql<number>`count(*) FILTER (WHERE ${loginLogs.success} = true)::int`,
    })
    .from(loginLogs)
    .innerJoin(credentials, eq(loginLogs.credentialId, credentials.id))
    .where(eq(credentials.userId, auth.userId));

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

  const fakeData = config.FAKE_DATA;
  return (
    <OverviewClient
      userEmail={auth.email}
      isAdmin={isAdminEmail(auth.email)}
      fakeData={fakeData}
      stats={{
        totalCredentials: userCredentials.length,
        totalSchedules: userSchedules.length,
        activeSchedules: userSchedules.filter((s: any) => s.enabled).length,
        totalLogins: totalStats?.total || 0,
        successRate:
          totalStats?.total && totalStats.total > 0
            ? Math.round((totalStats.success / totalStats.total) * 100)
            : 100,
        logins24h: stats24h?.total || 0,
        successRate24h:
          stats24h?.total && stats24h.total > 0
            ? Math.round((stats24h.success / stats24h.total) * 100)
            : 100,
      }}
      schedules={userSchedules}
      recentLogs={recentLogs}
    />
  );
}
