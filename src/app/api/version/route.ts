import { NextResponse } from "next/server";
import { config } from "@/lib/config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    name: "AutoLogin Scheduler",
    version: "1.2.0",
    author: "Sudhir Singh",
    github: "https://github.com/SudhirDevOps1/AutoLogin-Scheduler",
    fakeData: false,
    database: config.DB_TYPE,
    s3: config.HAS_STORAGE,
    email: config.HAS_EMAIL,
    auth: true,
    registration: config.ALLOW_REGISTRATION,
  });
}
