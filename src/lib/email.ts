import { db } from "@/db";
import { userSettings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { config } from "./config";
import { decryptCredential } from "./security";

interface EmailAlertParams {
  userId: string;
  toEmail: string;
  credentialName: string;
  siteUrl: string;
  credentialId: string;
  isManual: boolean;
  success?: boolean;
  error?: string | null;
}

export async function sendEmailAlert({
  userId,
  toEmail,
  credentialName,
  siteUrl,
  credentialId,
  isManual,
  success,
  error
}: EmailAlertParams) {
  // 1. Fetch custom user settings from database
  let provider = "disabled";
  let apiKey = "";
  let fromEmail = "alerts@yourdomain.com";
  let smtpHost = "";
  let smtpPort = 587;
  let smtpUser = "";
  let smtpPass = "";

  try {
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    
    const settings = rows[0];
    if (settings && settings.emailProvider !== "disabled") {
      provider = settings.emailProvider;
      fromEmail = settings.resendFrom || settings.smtpFrom || settings.brevoFrom || fromEmail;
      
      if (provider === "resend" && settings.resendApiKey) {
        apiKey = await decryptCredential(settings.resendApiKey);
      } else if (provider === "brevo" && settings.brevoApiKey) {
        apiKey = await decryptCredential(settings.brevoApiKey);
      } else if (provider === "smtp") {
        smtpHost = settings.smtpHost || "";
        smtpPort = settings.smtpPort || 587;
        smtpUser = settings.smtpUser || "";
        if (settings.smtpPass) {
          smtpPass = await decryptCredential(settings.smtpPass);
        }
      }
    }
  } catch (dbErr) {
    console.error("[email] Failed to query user settings from DB, using env fallback:", dbErr);
  }

  // 2. Fallback to Env Variables if no custom database provider is configured
  if (provider === "disabled") {
    if (config.RESEND_API_KEY) {
      provider = "resend";
      apiKey = config.RESEND_API_KEY;
      fromEmail = config.RESEND_FROM || fromEmail;
    } else if (config.SMTP_HOST) {
      provider = "smtp";
      smtpHost = config.SMTP_HOST;
      smtpPort = parseInt(config.SMTP_PORT || "587", 10);
      smtpUser = config.SMTP_USER || "";
      smtpPass = config.SMTP_PASS || "";
      fromEmail = config.SMTP_FROM || fromEmail;
    } else {
      console.warn("[email] No email provider (UI or Env) configured. Alert skipped.");
      return;
    }
  }

  // 3. Construct Email Contents
  const host = "https://autologin-scheduler.sudhirdevops1.workers.dev";
  const actionLink = `${host}/dashboard/launchpad?id=${credentialId}&action=login`;

  let subject = "";
  let htmlContent = "";

  if (isManual) {
    subject = `🔑 Action Required: Manual Login to ${credentialName}`;
    htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: #6366f1; margin-top: 0;">Manual Login Required</h2>
        <p>It is time to log in to <strong>${credentialName}</strong> (${siteUrl}).</p>
        <div style="margin: 24px 0;">
          <a href="${actionLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            One-Click Login (Launchpad)
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">This link will open the website and copy your login credentials to your dashboard launchpad.</p>
      </div>
    `;
  } else {
    subject = success 
      ? `✅ Auto-Login Success: ${credentialName}`
      : `❌ Auto-Login Failed: ${credentialName}`;
    
    htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <h2 style="color: ${success ? "#10b981" : "#ef4444"}; margin-top: 0;">Auto-Login ${success ? "Succeeded" : "Failed"}</h2>
        <p>Credential: <strong>${credentialName}</strong> (${siteUrl})</p>
        ${!success ? `<p style="color: #ef4444;"><strong>Error:</strong> ${error || "Unknown error"}</p>` : ""}
        <div style="margin: 24px 0;">
          <a href="${actionLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Open Launchpad
          </a>
        </div>
      </div>
    `;
  }

  // 4. Send Email based on active provider
  if (provider === "resend") {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: fromEmail,
          to: toEmail,
          subject: subject,
          html: htmlContent
        })
      });

      if (!res.ok) {
        console.error("[email] Resend API error:", await res.text());
      } else {
        console.log(`[email] Resend alert email sent to ${toEmail}`);
      }
    } catch (err) {
      console.error("[email] Resend fetch failed:", err);
    }
  } else if (provider === "brevo") {
    try {
      const res = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          sender: { email: fromEmail },
          to: [{ email: toEmail }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (!res.ok) {
        console.error("[email] Brevo API error:", await res.text());
      } else {
        console.log(`[email] Brevo alert email sent to ${toEmail}`);
      }
    } catch (err) {
      console.error("[email] Brevo fetch failed:", err);
    }
  } else if (provider === "smtp") {
    const isNode = typeof process !== "undefined" && process.release && process.release.name === "node";
    if (isNode) {
      try {
        const moduleName = "nodemailer";
        const nodemailer = require(moduleName);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        await transporter.sendMail({
          from: fromEmail,
          to: toEmail,
          subject: subject,
          html: htmlContent
        });
        console.log(`[email] SMTP alert email sent to ${toEmail} (Node.js)`);
      } catch (err) {
        console.error("[email] SMTP nodemailer delivery failed:", err);
      }
    } else {
      console.warn("[email] Custom SMTP TCP sockets are restricted on Cloudflare edge. Log payload:");
      console.log(`[SMTP SIMULATION] To: ${toEmail} | Subject: ${subject}`);
    }
  }
}

interface TestEmailParams {
  toEmail: string;
  emailProvider: string;
  resendApiKey?: string;
  resendFrom?: string;
  brevoApiKey?: string;
  brevoFrom?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpFrom?: string;
}

export async function sendTestEmail({
  toEmail,
  emailProvider,
  resendApiKey,
  resendFrom,
  brevoApiKey,
  brevoFrom,
  smtpHost,
  smtpPort = 587,
  smtpUser,
  smtpPass,
  smtpFrom,
}: TestEmailParams) {
  const subject = "🧪 AutoLogin Scheduler — Test Email Connection";
  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #6366f1; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);">
      <h2 style="color: #6366f1; margin-top: 0; font-size: 20px;">Connection Test Successful! 🎉</h2>
      <p style="color: #334155; font-size: 15px; line-height: 1.5;">Your email configuration is working perfectly.</p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 13px; color: #475569;">
        <strong>Configuration Used:</strong><br/>
        • Provider: <code style="color: #6366f1;">${emailProvider}</code><br/>
        • Sender: <code>${resendFrom || brevoFrom || smtpFrom || "default"}</code><br/>
        • Test Destination: <code>${toEmail}</code><br/>
        • Timestamp: <code>${new Date().toLocaleString()}</code>
      </div>
      <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">You can now safely enable automated alerts for site auto-login successes, failures, and manual intervention prompts.</p>
    </div>
  `;

  if (emailProvider === "resend") {
    if (!resendApiKey) throw new Error("Resend API Key is missing");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: resendFrom || "onboarding@resend.dev",
        to: toEmail,
        subject,
        html: htmlContent
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API: ${errText}`);
    }
  } else if (emailProvider === "brevo") {
    if (!brevoApiKey) throw new Error("Brevo API Key is missing");
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sender: { email: brevoFrom || "alerts@yourdomain.com" },
        to: [{ email: toEmail }],
        subject,
        htmlContent
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Brevo API: ${errText}`);
    }
  } else if (emailProvider === "smtp") {
    const isNode = typeof process !== "undefined" && process.release && process.release.name === "node";
    if (isNode) {
      try {
        const moduleName = "nodemailer";
        const nodemailer = require(moduleName);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        await transporter.sendMail({
          from: smtpFrom || "notifications@yourdomain.com",
          to: toEmail,
          subject,
          html: htmlContent
        });
      } catch (err: any) {
        throw new Error(`SMTP Load Error: ${err.message || err}. Custom SMTP is only supported on a native Node.js server. Please use Resend or Brevo on Cloudflare Workers.`);
      }
    } else {
      throw new Error(
        "Custom SMTP TCP port socket outbound streams are blocked on Cloudflare edge. Use Resend or Brevo HTTP API modes instead."
      );
    }
  } else {
    throw new Error(`Invalid email provider: ${emailProvider}`);
  }
}
