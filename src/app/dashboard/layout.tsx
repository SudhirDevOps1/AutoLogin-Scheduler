import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { DashboardShell } from "@/components/dashboard-shell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const auth = await getAuth();
  if (!auth) {
    redirect("/login");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, auth.userId),
  });
  if (!user) {
    redirect("/login");
  }

  const isAdmin = Boolean(
    process.env.ADMIN_EMAIL &&
      user.email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase()
  );

  return (
    <DashboardShell
      user={{ id: user.id, email: user.email }}
      isAdmin={isAdmin}
      demoMode={process.env.DEMO_MODE !== "false"}
    >
      {children}
    </DashboardShell>
  );
}
