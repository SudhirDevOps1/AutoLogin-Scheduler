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

// Custom SMTP protocol client over Cloudflare TCP sockets for Cloudflare Workers using worker-mailer
async function sendSmtpOverWorkerSocket(
  host: string,
  port: number,
  user: string,
  pass: string,
  from: string,
  to: string,
  subject: string,
  html: string
) {
  const { WorkerMailer } = await import("worker-mailer");
  
  const mailer = await WorkerMailer.connect({
    host,
    port,
    credentials: {
      username: user,
      password: pass,
    },
    authType: 'login',
    secure: port === 465,
  });

  await mailer.send({
    from: { name: 'AutoLogin Alert', email: from },
    to: { name: to, email: to },
    subject,
    html,
  });
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
  let provider = "disabled";
  let apiKey = "";
  let fromEmail = "alerts@yourdomain.com";
  let smtpHost = "";
  let smtpPort = 587;
  let smtpUser = "";
  let smtpPass = "";
  let targetEmail = toEmail;

  try {
    const rows = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    
    const settings = rows[0];
    if (settings) {
      if (settings.notificationEmail) {
        targetEmail = settings.notificationEmail;
      }
      if (settings.emailProvider !== "disabled") {
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
    }
  } catch (dbErr) {
    console.error("[email] Failed to query settings, using env fallback:", dbErr);
  }

  if (provider === "disabled") {
    if (config.SMTP_HOST) {
      provider = "smtp";
      smtpHost = config.SMTP_HOST;
      smtpPort = parseInt(config.SMTP_PORT || "587", 10);
      smtpUser = config.SMTP_USER || "";
      smtpPass = config.SMTP_PASS || "";
      fromEmail = config.SMTP_FROM || fromEmail;
    } else if (config.RESEND_API_KEY) {
      provider = "resend";
      apiKey = config.RESEND_API_KEY;
      fromEmail = config.RESEND_FROM || fromEmail;
    } else if (config.BREVO_API_KEY) {
      provider = "brevo";
      apiKey = config.BREVO_API_KEY;
      fromEmail = config.BREVO_FROM || fromEmail;
    } else {
      console.warn("[email] No email provider configured.");
      return;
    }
  }

  const host = "https://autologin-scheduler.sudhirdevops1.workers.dev";
  const actionLink = `${host}/dashboard/launchpad?id=${credentialId}&action=login`;

  let subject = "";
  let htmlContent = "";

  if (isManual) {
    subject = `🔑 Action Required: Manual Login to ${credentialName}`;
    htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; padding: 40px 20px; min-height: 100%;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-top: 4px solid #6366f1; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
          <div style="margin-bottom: 24px; text-align: center; font-size: 20px; font-weight: bold; color: #f8fafc; letter-spacing: 0.5px;">
            🔐 AutoLogin <span style="color: #6366f1;">Scheduler</span>
          </div>
          <div style="display: inline-block; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); color: #818cf8; font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; letter-spacing: 0.5px;">
            Manual Intervention Needed
          </div>
          <h2 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">Action Required: Manual Login</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            It is time to execute a manual check-in or login session for your credential. Please click the button below to launch the split-screen companion workspace.
          </p>
          <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e2e8f0;">
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Credential Name</td>
                <td style="font-weight: 600; text-align: right;">${credentialName}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Target URL</td>
                <td style="text-align: right;"><a href="${siteUrl}" style="color: #818cf8; text-decoration: none; font-weight: 600;">${siteUrl.replace(/https?:\/\//, "")}</a></td>
              </tr>
            </table>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${actionLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #ffffff; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
              One-Click Login (Launchpad)
            </a>
          </div>
          <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0; text-align: center;">
            This link securely loads your decrypted parameters directly inside the sandboxed companion workspace. Do not share this email.
          </p>
        </div>
      </div>
    `;
  } else {
    subject = success ? `✅ Auto-Login Success: ${credentialName}` : `❌ Auto-Login Failed: ${credentialName}`;
    const badgeColor = success ? "#10b981" : "#ef4444";
    const badgeBg = success ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
    const badgeBorder = success ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
    const headerBorder = success ? "#10b981" : "#ef4444";

    htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; padding: 40px 20px; min-height: 100%;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-top: 4px solid ${headerBorder}; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.3);">
          <div style="margin-bottom: 24px; text-align: center; font-size: 20px; font-weight: bold; color: #f8fafc; letter-spacing: 0.5px;">
            🔐 AutoLogin <span style="color: #6366f1;">Scheduler</span>
          </div>
          <div style="display: inline-block; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; color: ${badgeColor}; font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px; letter-spacing: 0.5px;">
            Auto-Login ${success ? "Success" : "Failed"}
          </div>
          <h2 style="color: #f8fafc; font-size: 20px; font-weight: 700; margin: 0 0 12px 0;">Auto-Login ${success ? "Completed" : "Execution Issue"}</h2>
          <p style="color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
            ${success 
              ? `The automated login check for <strong>${credentialName}</strong> has completed successfully. No action is required.` 
              : `The automated login check for <strong>${credentialName}</strong> encountered an error during execution. Details are listed below.`}
          </p>
          <div style="background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin-bottom: 28px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #e2e8f0;">
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Credential Name</td>
                <td style="font-weight: 600; text-align: right;">${credentialName}</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500;">Target URL</td>
                <td style="text-align: right;"><a href="${siteUrl}" style="color: #818cf8; text-decoration: none; font-weight: 600;">${siteUrl.replace(/https?:\/\//, "")}</a></td>
              </tr>
              ${!success ? `
              <tr>
                <td style="color: #64748b; padding: 6px 0; font-weight: 500; vertical-align: top;">Error Message</td>
                <td style="font-weight: 600; text-align: right; color: #ef4444; max-width: 250px; word-wrap: break-word;">${error || "Unknown execution timeout"}</td>
              </tr>
              ` : ""}
            </table>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${actionLink}" style="display: inline-block; background-color: #334155; border: 1px solid #475569; color: #f8fafc; font-weight: 600; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
              View Login History &amp; Logs
            </a>
          </div>
          <p style="color: #64748b; font-size: 11px; line-height: 1.5; margin: 0; text-align: center;">
            This email is an automated status report. You can pauses alerts anytime inside your scheduler dashboard.
          </p>
        </div>
      </div>
    `;
  }

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
          to: targetEmail,
          subject,
          html: htmlContent
        })
      });
      if (!res.ok) console.error("[email] Resend API error:", await res.text());
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
          to: [{ email: targetEmail }],
          subject,
          htmlContent
        })
      });
      if (!res.ok) console.error("[email] Brevo API error:", await res.text());
    } catch (err) {
      console.error("[email] Brevo fetch failed:", err);
    }
  } else if (provider === "smtp") {
    // Robust dynamic runtime fallback: try loading nodemailer (Node.js).
    // If it fails with dynamic require unsupported, fallback directly to Worker TCP sockets.
    let nodemailerSuccess = false;
    try {
      const moduleName = "nodemailer";
      const nodemailer = require(moduleName);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail({
        from: fromEmail,
        to: targetEmail,
        subject,
        html: htmlContent
      });
      nodemailerSuccess = true;
      console.log(`[email] SMTP alert email sent to ${targetEmail} (Node.js)`);
    } catch (_) {
      // Failed to load or execute nodemailer -> Run native Worker TCP Sockets
    }

    if (!nodemailerSuccess) {
      try {
        await sendSmtpOverWorkerSocket(smtpHost, smtpPort, smtpUser, smtpPass, fromEmail, targetEmail, subject, htmlContent);
        console.log(`[email] SMTP alert email successfully sent to ${targetEmail} via Worker TCP Sockets!`);
      } catch (err) {
        console.error("[email] SMTP worker socket delivery failed:", err);
      }
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
    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new Error("SMTP host, user, and password are required.");
    }
    let nodemailerSuccess = false;
    let nodemailerError: any = null;
    try {
      const moduleName = "nodemailer";
      const nodemailer = require(moduleName);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      await transporter.sendMail({
        from: smtpFrom || "notifications@yourdomain.com",
        to: toEmail,
        subject,
        html: htmlContent
      });
      nodemailerSuccess = true;
    } catch (err) {
      nodemailerError = err;
    }

    if (!nodemailerSuccess) {
      try {
        await sendSmtpOverWorkerSocket(smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom || "notifications@yourdomain.com", toEmail, subject, htmlContent);
      } catch (err: any) {
        throw new Error(`Worker SMTP Socket Error: ${err.message || err}. (Note: SMTP Port 465 with SSL is recommended on Cloudflare Workers)`);
      }
    }
  } else {
    throw new Error(`Invalid email provider: ${emailProvider}`);
  }
}
