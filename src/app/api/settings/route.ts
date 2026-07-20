import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, AuthError } from "@/lib/auth";
import { encryptCredential, decryptCredential } from "@/lib/security";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth();

    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, auth.userId))
      .limit(1);

    const settings = rows[0];

    const result = {
      emailProvider: settings?.emailProvider || "disabled",
      resendApiKey: settings?.resendApiKey ? "********" : "",
      resendFrom: settings?.resendFrom || "",
      smtpHost: settings?.smtpHost || "",
      smtpPort: settings?.smtpPort || 587,
      smtpUser: settings?.smtpUser || "",
      smtpPass: settings?.smtpPass ? "********" : "",
      smtpFrom: settings?.smtpFrom || "",
      brevoApiKey: settings?.brevoApiKey ? "********" : "",
      brevoFrom: settings?.brevoFrom || "",
      notificationEmail: settings?.notificationEmail || "",
      // Indicate environment variable status
      env: {
        hasResend: !!config.RESEND_API_KEY,
        hasSmtp: !!config.SMTP_HOST,
        resendFrom: config.RESEND_FROM || "",
        smtpFrom: config.SMTP_FROM || "",
      }
    };

    return NextResponse.json({ settings: result });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      emailProvider,
      resendApiKey,
      resendFrom,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
      brevoApiKey,
      brevoFrom,
      notificationEmail,
    } = body;

    // Strict validation checks
    if (notificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notificationEmail)) {
      return NextResponse.json({ error: "Invalid Email Notification Address format" }, { status: 400 });
    }

    if (smtpPort) {
      const parsedPort = parseInt(smtpPort, 10);
      if (isNaN(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
        return NextResponse.json({ error: "SMTP Port must be a valid number between 1 and 65535" }, { status: 400 });
      }
    }

    if (smtpFrom && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(smtpFrom)) {
      return NextResponse.json({ error: "Invalid SMTP Sender email format" }, { status: 400 });
    }

    if (resendFrom && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendFrom)) {
      return NextResponse.json({ error: "Invalid Resend Sender email format" }, { status: 400 });
    }

    if (brevoFrom && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(brevoFrom)) {
      return NextResponse.json({ error: "Invalid Brevo Sender email format" }, { status: 400 });
    }

    // Fetch existing settings
    const existingRows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, auth.userId))
      .limit(1);
    const existing = existingRows[0];

    // Encrypt sensitive secrets only if they changed and are not masked
    let finalResendKey = resendApiKey;
    if (resendApiKey === "********") {
      finalResendKey = existing?.resendApiKey || "";
    } else if (resendApiKey) {
      finalResendKey = await encryptCredential(resendApiKey);
    }

    let finalSmtpPass = smtpPass;
    if (smtpPass === "********") {
      finalSmtpPass = existing?.smtpPass || "";
    } else if (smtpPass) {
      finalSmtpPass = await encryptCredential(smtpPass);
    }

    let finalBrevoKey = brevoApiKey;
    if (brevoApiKey === "********") {
      finalBrevoKey = existing?.brevoApiKey || "";
    } else if (brevoApiKey) {
      finalBrevoKey = await encryptCredential(brevoApiKey);
    }

    const now = Date.now();

    if (existing) {
      // Update
      await db
        .update(userSettings)
        .set({
          emailProvider: emailProvider || "disabled",
          resendApiKey: finalResendKey || null,
          resendFrom: resendFrom || null,
          smtpHost: smtpHost || null,
          smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
          smtpUser: smtpUser || null,
          smtpPass: finalSmtpPass || null,
          smtpFrom: smtpFrom || null,
          brevoApiKey: finalBrevoKey || null,
          brevoFrom: brevoFrom || null,
          notificationEmail: notificationEmail || null,
          updatedAt: now,
        })
        .where(eq(userSettings.userId, auth.userId));
    } else {
      // Insert
      await db.insert(userSettings).values({
        userId: auth.userId,
        emailProvider: emailProvider || "disabled",
        resendApiKey: finalResendKey || null,
        resendFrom: resendFrom || null,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : null,
        smtpUser: smtpUser || null,
        smtpPass: finalSmtpPass || null,
        smtpFrom: smtpFrom || null,
        brevoApiKey: finalBrevoKey || null,
        brevoFrom: brevoFrom || null,
        notificationEmail: notificationEmail || null,
        updatedAt: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST settings error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
