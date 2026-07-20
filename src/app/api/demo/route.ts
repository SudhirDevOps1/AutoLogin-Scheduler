import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { credentials, schedules, loginLogs } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAuth, AuthError, logAudit } from "@/lib/auth";
import { isFakeData, seedDemoWorkspace } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();
    if (!isFakeData()) {
      return NextResponse.json(
        { demoMode: false, workspace: { credentials: 0, schedules: 0, logs: 0 } },
      );
    }
    const [credentialStats, scheduleStats, logStats] = await Promise.all([
      db.select({ count: sql<number>`CAST(count(*) AS INTEGER)` }).from(credentials).where(eq(credentials.userId, auth.userId)),
      db.select({ count: sql<number>`CAST(count(*) AS INTEGER)` }).from(schedules)
        .innerJoin(credentials, eq(schedules.credentialId, credentials.id))
        .where(eq(credentials.userId, auth.userId)),
      db.select({ count: sql<number>`CAST(count(*) AS INTEGER)` }).from(loginLogs)
        .innerJoin(credentials, eq(loginLogs.credentialId, credentials.id))
        .where(eq(credentials.userId, auth.userId)),
    ]);
    return NextResponse.json({
      demoMode: true,
      workspace: {
        credentials: credentialStats[0]?.count || 0,
        schedules: scheduleStats[0]?.count || 0,
        logs: logStats[0]?.count || 0,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Unable to read demo status" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if (!isFakeData()) {
      return NextResponse.json(
        { error: "FAKE_DATA=false — demo controls are disabled in production" },
        { status: 404 }
      );
    }
    const body = await request.json().catch(() => ({}));
    const action = body.action === "reset" ? "reset" : "seed";
    const result = await seedDemoWorkspace(auth.userId, { force: action === "reset" });
    void logAudit({
      userId: auth.userId,
      action: action === "reset" ? "demo.reset" : "demo.seed",
      targetType: "workspace",
      targetId: auth.userId,
      metadata: { ...result },
    }).catch(() => {});
    return NextResponse.json({
      success: true, action, result,
      message: action === "reset"
        ? "Demo workspace reset with fresh sample data."
        : result.seeded
          ? "Sample data added."
          : "Workspace already contains data.",
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Demo action failed" }, { status: 500 });
  }
}
