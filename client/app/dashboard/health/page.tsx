"use client";

import { RequireAuth } from "@/components/providers/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { HealthDashboard } from "@/components/health/health-dashboard";

export default function HealthPage() {
  return (
    <RequireAuth>
      <AppShell
        title="Repository Health"
        description="Indexing coverage, repository structure, and actionable health signals"
      >
        <HealthDashboard />
      </AppShell>
    </RequireAuth>
  );
}
