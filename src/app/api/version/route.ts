import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "autologin-scheduler",
    version: "1.0.0",
    fakeData: process.env.FAKE_DATA !== "false",
    database: process.env.DATABASE_URL ? "postgresql" : "d1",
    s3: Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET_NAME),
    email: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST),
    auth: Boolean(process.env.AUTH_SECRET || process.env.JWT_SECRET),
    registration: process.env.ALLOW_REGISTRATION !== "false",
  });
}
