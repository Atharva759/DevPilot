"use client";

import { RequireAuth } from "@/components/providers/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { LogAnalyzer } from "@/components/logs/log-analyzer";

export default function LogsPage() {
  return (
    <RequireAuth>
      <AppShell
        title="CI/CD Log Explainer"
        description="Diagnose build failures, stack traces, and deployment errors"
      >
        <LogAnalyzer />
      </AppShell>
    </RequireAuth>
  );
}
