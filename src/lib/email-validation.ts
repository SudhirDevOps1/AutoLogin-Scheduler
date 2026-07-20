// ─── MX DNS Email Validation (PrismAnalytics-style) ────────────────────
// Validates email domain has valid MX records via DNS lookup.
// Uses Cloudflare DNS over HTTPS as primary, Node.js dns as fallback.
// Blocks disposable email domains and non-existent domains.

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "throwaway.email", "yopmail.com", "shieldemail.com", "trashmail.com",
  "fakeinbox.com", "maildrop.cc", "getairmail.com", "emailondeck.com",
  "spam4.me", "mailexpire.com", "temp-mail.org", "mailcatch.com",
  "dispostable.com", "mailnesia.com", "mytemp.email", "tempemail.net",
  "fake-mail.net", "tempmail.net", "tempinbox.com", "mailmetrash.com",
  "burnermail.io", "emailfake.com", "spambox.us", "maileater.com",
  "mailnull.com", "mailinator2.com", "tempail.com", "mailnator.com",
  "mailinator.net", "spamgourmet.com", "sneakemail.com", "spamfree24.org",
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface EmailValidationResult {
  valid: boolean;
  error?: string;
  normalized?: string;
}

export function validateEmailFormat(email: string): boolean {
  if (!email || email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

export function isDisposableEmail(domain: string): boolean {
  return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
}

// Cloudflare DNS over HTTPS — works in any runtime (Node.js, Workers, Edge)
async function resolveMxViaDoH(domain: string): Promise<{ exchange: string; priority: number }[]> {
  const url = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`;
  const response = await fetch(url, {
    headers: { Accept: "application/dns-json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`DNS query failed: ${response.status}`);
  const data = (await response.json()) as {
    Status: number;
    Answer?: { name: string; type: number; data: string }[];
  };
  if (data.Status !== 0) throw new Error(`DNS error: ${data.Status}`);
  if (!data.Answer) return [];
  return data.Answer
    .filter((r) => r.type === 15) // MX record type
    .map((r) => {
      // Format: "10 mail.example.com."
      const parts = r.data.trim().split(/\s+/);
      const priority = parseInt(parts[0], 10);
      const exchange = parts.slice(1).join(" ").replace(/\.$/, "");
      return { exchange, priority: isNaN(priority) ? 10 : priority };
    });
}

// Node.js dns (only available in Node.js runtime)
let nodeDns: any = null;
try {
  nodeDns = require("dns/promises");
} catch { /* not in Node.js runtime */ }

export async function checkEmailMX(email: string): Promise<EmailValidationResult> {
  const normalized = email.toLowerCase().trim();

  if (!validateEmailFormat(normalized)) {
    return { valid: false, error: "Invalid email format" };
  }

  const parts = normalized.split("@");
  const domain = parts[1];

  // Check disposable email domains
  if (isDisposableEmail(domain)) {
    return { valid: false, error: "Disposable email addresses are not allowed" };
  }

  // MX DNS lookup — validates the domain can receive mail
  try {
    let records: { exchange: string; priority: number }[];

    if (nodeDns) {
      // Node.js runtime
      records = await nodeDns.resolveMx(domain);
    } else {
      // Edge/Worker runtime — use Cloudflare DoH
      records = await resolveMxViaDoH(domain);
    }

    if (!records || records.length === 0) {
      return { valid: false, error: "Domain has no mail servers (MX record)" };
    }
    // Sort by priority (lowest = highest priority)
    records.sort((a, b) => a.priority - b.priority);
    const mxDomain = records[0].exchange;

    // Suspicious patterns
    if (
      mxDomain.includes("invalid") ||
      mxDomain.includes("fake") ||
      mxDomain === "." ||
      mxDomain === domain
    ) {
      // Still allow — some domains configure MX pointing to themselves
    }

    return { valid: true, normalized };
  } catch (err: any) {
    const code = err.code || err.message || "";
    if (
      code.includes("ENOTFOUND") ||
      code.includes("ENODATA") ||
      code.includes("NXDOMAIN") ||
      code.includes("Domain not found")
    ) {
      return { valid: false, error: "Email domain does not exist" };
    }
    // DNS lookup failed but domain might still be valid — allow it.
    return { valid: true, normalized };
  }
}
