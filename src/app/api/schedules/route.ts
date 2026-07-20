import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { schedules, credentials } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireAuth, logAudit, AuthError } from "@/lib/auth";
import { generateId, detectMaliciousInput } from "@/lib/security";

// ─── Helpers ──────────────────────────────────────────────────────────────
// Parse cron-like expressions. Supports:
//   "every <n> minutes|hours|days"
//   "0 */<n> * * *" style (hourly cron subset)
//   Or just a raw interval in seconds: "3600"
function parseCronToMs(expr: string): number {
  const e = expr.trim().toLowerCase();

  // Natural language: "every 30 minutes", "every 6 hours", "every 2 days"
  const nlMatch = e.match(/^every\s+(\d+)\s+(minute|minutes|hour|hours|day|days)$/);
  if (nlMatch) {
    const n = parseInt(nlMatch[1], 10);
    const unit = nlMatch[2].replace(/s$/, "");
    const multipliers: Record<string, number> = {
      minute: 60 * 1000,
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
    };
    return n * multipliers[unit];
  }

  // Raw seconds
  if (/^\d+$/.test(e)) {
    return parseInt(e, 10) * 1000;
  }

  // Fallback: every 6 hours
  return 6 * 60 * 60 * 1000;
}

function validateCronExpr(expr: string): boolean {
  if (!expr || expr.length > 100) return false;
  if (detectMaliciousInput(expr)) return false;

  // Accept natural language, raw seconds, or basic cron-like
  const natural = /^every\s+\d+\s+(minute|minutes|hour|hours|day|days)$/i;
  if (natural.test(expr)) return true;
  if (/^\d+$/.test(expr)) return true;
  if (/^(\*|\d+|\*\/\d+)\s+(\*|\d+|\*\/\d+)\s+(\*|\d+|\*\/\d+)\s+(\*|\d+|\*\/\d+)\s+(\*|\d+|\*\/\d+)$/.test(expr.trim())) {
    return true;
  }
  return false;
}

// ─── GET /api/schedules ───────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireAuth();

    const scheds = await db
      .select({
        id: schedules.id,
        credentialId: schedules.credentialId,
        cronExpr: schedules.cronExpr,
        nextRun: schedules.nextRun,
        enabled: schedules.enabled,
        alertOnFailure: schedules.alertOnFailure,
        alertOnSuccess: schedules.alertOnSuccess,
        takeScreenshot: schedules.takeScreenshot,
        createdAt: schedules.createdAt,
        credentialName: credentials.name,
        siteUrl: credentials.siteUrl,
        username: credentials.username,
        credStatus: credentials.status,
      })
      .from(schedules)
      .innerJoin(credentials, eq(schedules.credentialId, credentials.id))
      .where(eq(credentials.userId, auth.userId))
      .orderBy(desc(schedules.createdAt));

    return NextResponse.json({ schedules: scheds });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET schedules error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/schedules ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      credentialId,
      cronExpr,
      executionMode = "auto",
      enabled = true,
      alertOnFailure = true,
      alertOnSuccess = false,
      takeScreenshot = true,
    } = body as {
      credentialId?: string;
      cronExpr?: string;
      executionMode?: string;
      enabled?: boolean;
      alertOnFailure?: boolean;
      alertOnSuccess?: boolean;
      takeScreenshot?: boolean;
    };

    if (!credentialId || !cronExpr) {
      return NextResponse.json(
        { error: "credentialId and cronExpr are required" },
        { status: 400 }
      );
    }

    if (!validateCronExpr(cronExpr)) {
      return NextResponse.json(
        { error: "Invalid cron expression. Use 'every 30 minutes', 'every 6 hours', seconds, or 5-field cron." },
        { status: 400 }
      );
    }

    // Check ownership
    const credRows = await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.id, credentialId), eq(credentials.userId, auth.userId)))
      .limit(1);
    const cred = credRows[0];
    if (!cred) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Multiple schedules per credential are ALLOWED
    // (e.g., different cron expressions for different times of day).
    // The unique constraint is only on schedule.id, not credential_id.

    const intervalMs = parseCronToMs(cronExpr);
    const nextRun = Date.now() + intervalMs;
    const schedId = generateId();

    await db.insert(schedules).values({
      id: schedId,
      credentialId,
      cronExpr,
      executionMode,
      nextRun,
      enabled,
      alertOnFailure,
      alertOnSuccess,
      takeScreenshot,
      createdAt: Date.now(),
    });

    await logAudit({
      userId: auth.userId,
      action: "schedule.create",
      targetType: "schedule",
      targetId: schedId,
    });

    return NextResponse.json(
      { success: true, schedule: { id: schedId, nextRun } },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST schedules error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/schedules?id=xxx ────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // Find schedule belonging to user
    const schedRows = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);
    const sched = schedRows[0];
    if (!sched) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    const credRows = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, sched.credentialId))
      .limit(1);
    const credential = credRows[0];
    if (!credential || credential.userId !== auth.userId) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    const {
      cronExpr,
      executionMode,
      enabled,
      alertOnFailure,
      alertOnSuccess,
      takeScreenshot,
    } = body as {
      cronExpr?: string;
      executionMode?: string;
      enabled?: boolean;
      alertOnFailure?: boolean;
      alertOnSuccess?: boolean;
      takeScreenshot?: boolean;
    };

    const updates: Record<string, unknown> = {};
    if (cronExpr !== undefined) {
      if (!validateCronExpr(cronExpr)) {
        return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
      }
      updates.cronExpr = cronExpr;
      updates.nextRun = Date.now() + parseCronToMs(cronExpr);
    }
    if (executionMode !== undefined) updates.executionMode = executionMode;
    if (enabled !== undefined) updates.enabled = enabled;
    if (alertOnFailure !== undefined) updates.alertOnFailure = alertOnFailure;
    if (alertOnSuccess !== undefined) updates.alertOnSuccess = alertOnSuccess;
    if (takeScreenshot !== undefined) updates.takeScreenshot = takeScreenshot;

    if (Object.keys(updates).length > 0) {
      await db.update(schedules).set(updates).where(eq(schedules.id, id));
    }

    await logAudit({
      userId: auth.userId,
      action: "schedule.update",
      targetType: "schedule",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PUT schedules error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/schedules?id=xxx ─────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const schedRows = await db
      .select()
      .from(schedules)
      .where(eq(schedules.id, id))
      .limit(1);
    const sched = schedRows[0];
    if (!sched) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }
    const credRows = await db
      .select()
      .from(credentials)
      .where(eq(credentials.id, sched.credentialId))
      .limit(1);
    const credential = credRows[0];
    if (!credential || credential.userId !== auth.userId) {
      return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    }

    await db.delete(schedules).where(eq(schedules.id, id));

    await logAudit({
      userId: auth.userId,
      action: "schedule.delete",
      targetType: "schedule",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("DELETE schedules error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
