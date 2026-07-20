import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { encryptCredential, decryptCredential } from "@/lib/security";
import { sendTestEmail } from "@/lib/email";
import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

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

    // Fetch existing settings to see if we should fallback to stored passwords if masked
    const existingRows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, auth.userId))
      .limit(1);
    const existing = existingRows[0];

    // Decrypt keys if they are masked, otherwise use raw input
    let finalResendKey = resendApiKey;
    if (resendApiKey === "********") {
      finalResendKey = existing?.resendApiKey ? await decryptCredential(existing.resendApiKey) : "";
    }

    let finalSmtpPass = smtpPass;
    if (smtpPass === "********") {
      finalSmtpPass = existing?.smtpPass ? await decryptCredential(existing.smtpPass) : "";
    }

    let finalBrevoKey = brevoApiKey;
    if (brevoApiKey === "********") {
      finalBrevoKey = existing?.brevoApiKey ? await decryptCredential(existing.brevoApiKey) : "";
    }

    const targetEmail = notificationEmail || auth.email;

    // Attempt sending test email to custom target email
    await sendTestEmail({
      toEmail: targetEmail,
      emailProvider,
      resendApiKey: finalResendKey,
      resendFrom,
      brevoApiKey: finalBrevoKey,
      brevoFrom,
      smtpHost,
      smtpPort: smtpPort ? parseInt(smtpPort, 10) : undefined,
      smtpUser,
      smtpPass: finalSmtpPass,
      smtpFrom,
    });

    return NextResponse.json({ success: true, message: `Test email sent successfully to ${targetEmail}!` });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Test email connection error:", err);
    return NextResponse.json({ error: err.message || "Failed to send test email. Check your settings." }, { status: 400 });
  }
}
