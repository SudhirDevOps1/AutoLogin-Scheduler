import { NextRequest, NextResponse } from "next/server";
import { checkEmailMX, isDisposableEmail, validateEmailFormat } from "@/lib/email-validation";
import { hashIP } from "@/lib/security";
import { checkRateLimit } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/check-email?email=user@example.com
 * Returns MX validation, disposable check, format check.
 * Rate limited: 30 requests per minute per IP.
 */
export async function GET(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Rate limit
  const rl = await checkRateLimit({
    key: `check-email:ip:${hashIP(ip)}`,
    max: 30,
    windowMs: 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const email = req.nextUrl.searchParams.get("email") || "";
  if (!email) {
    return NextResponse.json({ error: "email parameter required" }, { status: 400 });
  }

  const formatValid = validateEmailFormat(email);
  if (!formatValid) {
    return NextResponse.json({
      valid: false,
      format: false,
      error: "Invalid email format",
    });
  }

  const domain = email.split("@")[1];
  const disposable = isDisposableEmail(domain);
  const mxResult = await checkEmailMX(email);

  const domains: string[] = [];
  if (mxResult.valid && mxResult.normalized) {
    const parts = mxResult.normalized.split("@");
    const mxDomain = parts[1];
    // Suggest correction for common typos
    const suggestions: Record<string, string> = {
      "gmail.com": "gmail.com",
      "gmial.com": "gmail.com",
      "gmal.com": "gmail.com",
      "gnail.com": "gmail.com",
      "yaho.com": "yahoo.com",
      "yaoo.com": "yahoo.com",
      "hotnail.com": "hotmail.com",
      "hotmai.com": "hotmail.com",
      "outloo.com": "outlook.com",
    };
    if (suggestions[mxDomain]) {
      domains.push(suggestions[mxDomain]);
    }
  }

  return NextResponse.json({
    valid: mxResult.valid && !disposable,
    format: true,
    disposable,
    mx: mxResult.valid,
    error: mxResult.error || (disposable ? "Disposable email not allowed" : undefined),
    domain,
    domains,
  });
}
