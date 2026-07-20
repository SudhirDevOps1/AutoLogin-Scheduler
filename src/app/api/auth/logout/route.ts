import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuth, revokeSession, clearSessionCookie, logAudit } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("autologin_session")?.value;
    const auth = await getAuth();

    if (auth && token) {
      await revokeSession(token);
      await logAudit({
        userId: auth.userId,
        action: "user.logout",
        targetType: "user",
        targetId: auth.userId,
        ip: req.headers.get("x-forwarded-for") || "unknown",
      });
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Logout error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
