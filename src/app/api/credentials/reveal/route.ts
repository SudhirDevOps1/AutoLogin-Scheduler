import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { credentials } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, AuthError, logAudit } from "@/lib/auth";
import { decryptCredential } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Credential ID is required" }, { status: 400 });
    }

    const credRows = await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, auth.userId)))
      .limit(1);

    const cred = credRows[0];
    if (!cred) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    let password = null;
    try {
      password = await decryptCredential(cred.encryptedPassword);
    } catch (e) {
      return NextResponse.json({ error: "Failed to decrypt password" }, { status: 500 });
    }

    // Log this sensitive action
    await logAudit({
      userId: auth.userId,
      action: "credential.reveal",
      targetType: "credential",
      targetId: id,
      ip: req.headers.get("x-forwarded-for") || undefined,
    }).catch(() => {});

    return NextResponse.json({ success: true, password });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Reveal API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
