import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { isFakeData } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "AutoLogin Scheduler",
    version: "1.0.0",
    author: "Sudhir Singh",
    github: "https://github.com/SudhirDevOps1/AutoLogin-Scheduler",
    fakeData: isFakeData(),
    database: config.DB_LABEL,   // "postgresql" | "turso-libsql" | "cloudflare-d1"
    s3: config.HAS_STORAGE,
    email: config.HAS_EMAIL,
    auth: true,
    registration: config.ALLOW_REGISTRATION,
  });
}
