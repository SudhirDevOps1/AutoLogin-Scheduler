import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { loginLogs, credentials } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get("pageSize") || "25", 10)));
    const success = url.searchParams.get("success");

    const whereConditions = [eq(credentials.userId, auth.userId)];
    if (success === "true") whereConditions.push(eq(loginLogs.success, true));
    if (success === "false") whereConditions.push(eq(loginLogs.success, false));

    const [logs, count] = await Promise.all([
      db
        .select({
          id: loginLogs.id,
          credentialId: loginLogs.credentialId,
          runTime: loginLogs.runTime,
          durationMs: loginLogs.durationMs,
          success: loginLogs.success,
          screenshotKey: loginLogs.screenshotKey,
          screenshotUrl: loginLogs.screenshotUrl,
          errorMessage: loginLogs.errorMessage,
          createdAt: loginLogs.createdAt,
          credentialName: credentials.name,
          siteUrl: credentials.siteUrl,
          username: credentials.username,
        })
        .from(loginLogs)
        .innerJoin(credentials, eq(loginLogs.credentialId, credentials.id))
        .where(and(...whereConditions))
        .orderBy(desc(loginLogs.runTime))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ count: sql<number>`CAST(count(*) AS INTEGER)` })
        .from(loginLogs)
        .innerJoin(credentials, eq(loginLogs.credentialId, credentials.id))
        .where(and(...whereConditions)),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        pageSize,
        total: count[0]?.count || 0,
        totalPages: Math.ceil((count[0]?.count || 0) / pageSize),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET logs error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
