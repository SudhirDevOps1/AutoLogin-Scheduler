import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { credentials, loginLogs, schedules } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth";
import { generateId } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const { credentialId, success, errorMessage, durationMs } = body;

    if (!credentialId || typeof success !== "boolean") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify ownership
    const credRows = await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.id, credentialId), eq(credentials.userId, auth.userId)))
      .limit(1);
    
    if (!credRows[0]) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    const now = Date.now();
    const logId = generateId();

    // Insert the manual log
    await db.insert(loginLogs).values({
      id: logId,
      credentialId,
      runTime: now,
      durationMs: durationMs || 0,
      success,
      screenshotKey: null,
      screenshotUrl: null,
      errorMessage: errorMessage || (success ? "Manual login successful" : "Manual login failed"),
      ipAddress: "manual-launchpad",
      createdAt: now,
    });

    // Update credential status
    await db
      .update(credentials)
      .set({
        lastLogin: now,
        status: success ? "active" : "failed",
      })
      .where(eq(credentials.id, credentialId));

    return NextResponse.json({ success: true, logId });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Manual log API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
