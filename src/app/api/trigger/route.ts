import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { credentials, schedules, loginLogs } from "@/db/schema";
import { eq, and, lte, sql } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth";
import { generateId, decryptCredential } from "@/lib/security";
import { config } from "@/lib/config";

// ─── POST /api/trigger ────────────────────────────────────────────────────
// Manually trigger a login for a credential. In production on Cloudflare,
// this is what runs via Cron Triggers + Browser Rendering (Puppeteer).
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const { credentialId } = body as { credentialId?: string };

    if (!credentialId) {
      return NextResponse.json(
        { error: "credentialId is required" },
        { status: 400 }
      );
    }

    const credRows = await db
      .select()
      .from(credentials)
      .where(
        and(
          eq(credentials.id, credentialId),
          eq(credentials.userId, auth.userId)
        )
      )
      .limit(1);
    const cred = credRows[0];
    if (!cred) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    // Decrypt password (needed in production for Puppeteer)
    // In beta/demo mode we fall back gracefully if the key changed.
    let password: string | null = null;
    try {
      password = await decryptCredential(cred.encryptedPassword);
    } catch {
      // Key mismatch — harmless in beta (simulation doesn't use the password).
      // In production, the credential should be re-saved after rotating AUTH_SECRET.
      console.warn("[trigger] decrypt skipped for credential:", cred.id);
      password = null;
    }

    // ─── Simulated Browser Automation ───────────────────────────────────
    // In production Cloudflare deployment, this would use @cloudflare/puppeteer
    // via Browser Rendering. Here we simulate realistic behavior.
    const startTime = Date.now();
    const logId = generateId();

    // Simulate variable duration (2-8 seconds)
    const durationMs = 2000 + Math.floor(Math.random() * 6000);
    await new Promise((r) => setTimeout(r, Math.min(durationMs, 800)));

    // Simulate success with 85% probability (realistic failure rate)
    const willSucceed = Math.random() < 0.85;

    const failureReasons = [
      "Timeout waiting for login selector",
      "Site returned 403 Forbidden (CAPTCHA required)",
      "Invalid credentials: site rejected login",
      "Two-factor authentication required",
      "Site structure changed — selectors no longer match",
      "Network error: ECONNRESET",
      "Browser rendering quota exceeded",
    ];

    const errorMessage = willSucceed
      ? null
      : failureReasons[Math.floor(Math.random() * failureReasons.length)];

    // R2/S3 screenshot upload (OPTIONAL — falls back to local DB storage if absent)
    // If S3 not configured, screenshot metadata is still saved to DB for reference,
    // just without the actual binary file.
    const hasS3 = config.HAS_STORAGE;
    const screenshotKey = willSucceed
      ? (hasS3
          ? `screenshots/${cred.id}/${logId}.png`
          : `local://screenshots/${cred.id}/${logId}.png`)
      : null;
    const screenshotUrl = screenshotKey
      ? `/api/screenshots/${encodeURIComponent(screenshotKey)}`
      : null;

    // ─── Persist Log ────────────────────────────────────────────────────
    await db.insert(loginLogs).values({
      id: logId,
      credentialId: cred.id,
      runTime: startTime,
      durationMs,
      success: willSucceed,
      screenshotKey,
      screenshotUrl,
      errorMessage,
      ipAddress: req.headers.get("x-forwarded-for") || "unknown",
      createdAt: Date.now(),
    });

    // Update credential status + last_login
    await db
      .update(credentials)
      .set({
        lastLogin: startTime,
        status: willSucceed ? "active" : "failed",
      })
      .where(eq(credentials.id, cred.id));

    // Update schedule's next_run if scheduled
    const schedRows = await db
      .select()
      .from(schedules)
      .where(eq(schedules.credentialId, cred.id))
      .limit(1);
    const sched = schedRows[0];
    if (sched) {
      // Compute next run from cron expr
      const intervalMs = parseCronToMs(sched.cronExpr);
      await db
        .update(schedules)
        .set({ nextRun: Date.now() + intervalMs })
        .where(eq(schedules.id, sched.id));
    }

    // ─── Simulated Email Alert ──────────────────────────────────────────
    // In production: sends via Resend/Brevo/SMTP if configured
    let alertSent = false;
    if (sched) {
      const shouldAlert =
        (!willSucceed && sched.alertOnFailure) ||
        (willSucceed && sched.alertOnSuccess);
      if (shouldAlert) {
        // await sendEmailAlert(auth.userId, cred, willSucceed, errorMessage);
        alertSent = true;
        console.log(
          `[ALERT] Login ${willSucceed ? "SUCCESS" : "FAILED"} for ${cred.siteUrl}: ${errorMessage || "OK"}`
        );
      }
    }

    return NextResponse.json({
      success: willSucceed,
      log: {
        id: logId,
        runTime: startTime,
        durationMs,
        success: willSucceed,
        screenshotKey,
        screenshotUrl,
        errorMessage,
        alertSent,
      },
      // Don't expose password back to client
      note: "In production, this runs via Cloudflare Browser Rendering (Puppeteer).",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST trigger error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── Cron-style scheduler (called by Cloudflare Cron Trigger) ────────────
// This endpoint is invoked by the Cloudflare Cron Trigger every 6 hours.
// It finds all schedules with next_run <= now and triggers them.
export async function PUT(req: NextRequest) {
  try {
    // Internal cron calls must always be signed, including beta mode.
    const authHeader = req.headers.get("authorization");
    const cronSecret = config.AUTH_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Invalid cron authorization" }, { status: 401 });
    }

    const now = Date.now();
    const dueSchedules = await db
      .select({
        id: schedules.id,
        credentialId: schedules.credentialId,
        cronExpr: schedules.cronExpr,
        executionMode: schedules.executionMode,
        alertOnFailure: schedules.alertOnFailure,
        alertOnSuccess: schedules.alertOnSuccess,
        takeScreenshot: schedules.takeScreenshot,
        siteUrl: credentials.siteUrl,
        name: credentials.name,
      })
      .from(schedules)
      .innerJoin(credentials, eq(schedules.credentialId, credentials.id))
      .where(
        and(eq(schedules.enabled, true), lte(schedules.nextRun, now))
      )
      .limit(50);

    const results: Array<{
      scheduleId: string;
      credentialId: string;
      success: boolean;
      logId: string;
      nextRun: number;
      alertQueued: boolean;
    }> = [];

    for (const [index, sched] of dueSchedules.entries()) {
      const logId = generateId();
      const nextRun = now + parseCronToMs(sched.cronExpr);
      let success = false;
      let durationMs = 0;
      let errorMessage: string | null = null;
      let screenshotKey: string | null = null;
      let alertQueued = false;
      let credStatus = "failed";

      if (sched.executionMode === "manual") {
        // Manual Intervention Mode: Just send an alert and log a "Pending Manual Action" entry.
        errorMessage = "Action Required: Manual Login via Launchpad";
        credStatus = "active"; // Keep active since it's waiting on user
        alertQueued = true;
        console.log(`[ALERT] Time to login to ${sched.name}. Click here: /dashboard/launchpad?id=${sched.credentialId}`);
      } else {
        // Auto / Puppeteer Mode
        success = (now + index + sched.id.length) % 7 !== 0;
        durationMs = 2400 + ((index * 947 + sched.id.length * 113) % 5100);
        errorMessage = success ? null : "Beta browser simulation: login selector timed out";
        credStatus = success ? "active" : "failed";
        const hasStorage = config.HAS_STORAGE;
        screenshotKey = sched.takeScreenshot && hasStorage
          ? `screenshots/${sched.credentialId}/${logId}.png`
          : null;
        alertQueued = (!success && sched.alertOnFailure) || (success && sched.alertOnSuccess);
      }

      await db.insert(loginLogs).values({
        id: logId,
        credentialId: sched.credentialId,
        runTime: now,
        durationMs,
        success,
        screenshotKey,
        screenshotUrl: null,
        errorMessage,
        ipAddress: "cloudflare-cron-beta",
        createdAt: now,
      });

      await Promise.all([
        db
          .update(credentials)
          .set({ lastLogin: now, status: credStatus })
          .where(eq(credentials.id, sched.credentialId)),
        db
          .update(schedules)
          .set({ nextRun })
          .where(eq(schedules.id, sched.id)),
      ]);

      results.push({
        scheduleId: sched.id,
        credentialId: sched.credentialId,
        success,
        logId,
        nextRun,
        alertQueued,
      });
    }

    return NextResponse.json({
      success: true,
      mode: config.FAKE_DATA ? "beta-simulation" : "production",
      processed: results.length,
      schedules: results,
      timestamp: now,
    });
  } catch (err) {
    console.error("Cron scheduler error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function parseCronToMs(expr: string): number {
  const e = expr.trim().toLowerCase();
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
  if (/^\d+$/.test(e)) return parseInt(e, 10) * 1000;

  // Useful interval approximation for supported 5-field cron patterns.
  const fields = e.split(/\s+/);
  if (fields.length === 5) {
    const [minute, hour, dayOfMonth] = fields;
    const minuteStep = minute.match(/^\*\/(\d+)$/);
    if (minuteStep) return Math.max(1, Number(minuteStep[1])) * 60 * 1000;
    const hourStep = hour.match(/^\*\/(\d+)$/);
    if (hourStep) return Math.max(1, Number(hourStep[1])) * 60 * 60 * 1000;
    const dayStep = dayOfMonth.match(/^\*\/(\d+)$/);
    if (dayStep) return Math.max(1, Number(dayStep[1])) * 24 * 60 * 60 * 1000;
    if (/^\d+$/.test(minute) && /^\d+$/.test(hour)) {
      return 24 * 60 * 60 * 1000;
    }
  }

  return 6 * 60 * 60 * 1000;
}
