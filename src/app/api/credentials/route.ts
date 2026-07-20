import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { credentials, schedules, loginLogs } from "@/db/schema";
import { eq, sql, and, desc } from "drizzle-orm";
import { requireAuth, logAudit, AuthError } from "@/lib/auth";
import {
  generateId,
  encryptCredential,
  decryptCredential,
  detectMaliciousInput,
} from "@/lib/security";

// ─── GET /api/credentials ─────────────────────────────────────────────────
export async function GET() {
  try {
    const auth = await requireAuth();

    const creds = await db
      .select()
      .from(credentials)
      .where(eq(credentials.userId, auth.userId))
      .orderBy(desc(credentials.createdAt));

    // Attach schedule + last log info
    const enriched = await Promise.all(
      creds.map(async (c: any) => {
        const [sched] = await db
          .select()
          .from(schedules)
          .where(eq(schedules.credentialId, c.id))
          .limit(1);

        const [lastLog] = await db
          .select()
          .from(loginLogs)
          .where(eq(loginLogs.credentialId, c.id))
          .orderBy(desc(loginLogs.runTime))
          .limit(1);

        const { encryptedPassword: _encryptedPassword, ...safeCredential } = c;
        return {
          ...safeCredential,
          schedule: sched || null,
          lastLog: lastLog || null,
          // Encrypted material never leaves the server.
          hasPassword: Boolean(_encryptedPassword),
        };
      })
    );

    return NextResponse.json({ credentials: enriched });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("GET credentials error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/credentials ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      name,
      siteUrl,
      username,
      password,
      loginSelector,
      passwordSelector,
      submitSelector,
      successIndicator,
    } = body as {
      name?: string;
      siteUrl?: string;
      username?: string;
      password?: string;
      loginSelector?: string;
      passwordSelector?: string;
      submitSelector?: string;
      successIndicator?: string;
    };

    if (!name || !siteUrl || !username || !password) {
      return NextResponse.json(
        { error: "Name, site URL, username, and password are required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(siteUrl);
    } catch {
      return NextResponse.json({ error: "Invalid site URL" }, { status: 400 });
    }

    // Malicious input detection
    if (
      detectMaliciousInput(name) ||
      detectMaliciousInput(siteUrl) ||
      detectMaliciousInput(username)
    ) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Encrypt password
    const encryptedPassword = await encryptCredential(password);
    const credId = generateId();
    const now = Date.now();

    await db.insert(credentials).values({
      id: credId,
      userId: auth.userId,
      name,
      siteUrl,
      username,
      encryptedPassword,
      loginSelector: loginSelector || null,
      passwordSelector: passwordSelector || null,
      submitSelector: submitSelector || null,
      successIndicator: successIndicator || null,
      status: "active",
      createdAt: now,
    });

    await logAudit({
      userId: auth.userId,
      action: "credential.create",
      targetType: "credential",
      targetId: credId,
    });

    return NextResponse.json(
      {
        success: true,
        credential: {
          id: credId,
          name,
          siteUrl,
          username,
          status: "active",
        },
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("POST credentials error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PUT /api/credentials?id=xxx ──────────────────────────────────────────
export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const existingRows = await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, auth.userId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const {
      name,
      siteUrl,
      username,
      password,
      loginSelector,
      passwordSelector,
      submitSelector,
      successIndicator,
      status,
    } = body as {
      name?: string;
      siteUrl?: string;
      username?: string;
      password?: string;
      loginSelector?: string;
      passwordSelector?: string;
      submitSelector?: string;
      successIndicator?: string;
      status?: string;
    };

    if (name !== undefined) updates.name = name;
    if (siteUrl !== undefined) {
      try {
        new URL(siteUrl);
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
      updates.siteUrl = siteUrl;
    }
    if (username !== undefined) updates.username = username;
    if (password !== undefined && password.length > 0) {
      updates.encryptedPassword = await encryptCredential(password);
    }
    if (loginSelector !== undefined) updates.loginSelector = loginSelector;
    if (passwordSelector !== undefined) updates.passwordSelector = passwordSelector;
    if (submitSelector !== undefined) updates.submitSelector = submitSelector;
    if (successIndicator !== undefined) updates.successIndicator = successIndicator;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length > 0) {
      await db
        .update(credentials)
        .set(updates)
        .where(eq(credentials.id, id));
    }

    await logAudit({
      userId: auth.userId,
      action: "credential.update",
      targetType: "credential",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("PUT credentials error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/credentials?id=xxx ───────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existingRows = await db
      .select()
      .from(credentials)
      .where(and(eq(credentials.id, id), eq(credentials.userId, auth.userId)))
      .limit(1);
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    await db.delete(credentials).where(eq(credentials.id, id));

    await logAudit({
      userId: auth.userId,
      action: "credential.delete",
      targetType: "credential",
      targetId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("DELETE credentials error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
