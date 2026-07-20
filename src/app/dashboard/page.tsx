"use client";

import { useEffect, useState } from "react";
import { OverviewClient } from "./overview-client";

interface Sched {
  id: string;
  credentialId: string;
  cronExpr: string;
  nextRun: number;
  enabled: boolean;
  credentialName: string;
  siteUrl: string;
}

interface Log {
  id: string;
  runTime: number;
  durationMs: number;
  success: boolean;
  errorMessage: string | null;
  credentialName: string;
  siteUrl: string;
}

export default function DashboardOverview() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    stats: any;
    schedules: Sched[];
    recentLogs: Log[];
  } | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [meRes, schedsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/schedules"),
        ]);

        if (meRes.ok && schedsRes.ok) {
          const meData = await meRes.json();
          const schedsData = await schedsRes.json();

          // We enrich the recent logs and stats
          const stats = {
            totalCredentials: meData.stats.totalCredentials,
            totalSchedules: meData.stats.totalSchedules,
            activeSchedules: meData.stats.activeSchedules,
            totalLogins: meData.stats.logins24h || 0, // Fallback/use 24h as proxy or simple display
            successRate: meData.stats.successRate24h,
            logins24h: meData.stats.logins24h,
            successRate24h: meData.stats.successRate24h,
          };

          setData({
            stats,
            schedules: schedsData.schedules || [],
            recentLogs: meData.recentLogs || [],
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data) return <div>Failed to load dashboard.</div>;

  return (
    <OverviewClient
      userEmail=""
      isAdmin={false}
      fakeData={true}
      stats={data.stats}
      schedules={data.schedules}
      recentLogs={data.recentLogs}
    />
  );
}
