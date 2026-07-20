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
    // If in Node.js dev server mode, we can use nodemailer
    const isNode = typeof process !== "undefined" && process.release && process.release.name === "node";
    if (isNode) {
      try {
        const nodemailer = require("nodemailer");
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
      // Cloudflare Workers: direct TCP port sockets are restricted unless connect API is used.
      // Print warning and log execution payload.
      console.warn("[email] Custom SMTP TCP sockets are restricted on Cloudflare edge. Log payload:");
      console.log(`[SMTP SIMULATION] To: ${toEmail} | Subject: ${subject}`);
    }
  }
}
