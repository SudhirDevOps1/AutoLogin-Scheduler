import { config } from "./config";

interface EmailAlertParams {
  toEmail: string;
  credentialName: string;
  siteUrl: string;
  credentialId: string;
  isManual: boolean;
  success?: boolean;
  error?: string | null;
}

export async function sendEmailAlert({
  toEmail,
  credentialName,
  siteUrl,
  credentialId,
  isManual,
  success,
  error
}: EmailAlertParams) {
  const apiKey = config.RESEND_API_KEY;
  const fromEmail = config.RESEND_FROM || "alerts@yourdomain.com";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY is not set. Email alert skipped.");
    return;
  }

  // Construct the secure direct launchpad link
  // In production, we retrieve the hostname from a standard environment variable or default to the worker domain
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
      const errText = await res.text();
      console.error("[email] Resend API error:", errText);
    } else {
      console.log(`[email] Alert email successfully sent to ${toEmail}`);
    }
  } catch (err) {
    console.error("[email] Failed to send email alert:", err);
  }
}
