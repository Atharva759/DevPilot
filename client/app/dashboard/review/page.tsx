"use client";

import { RequireAuth } from "@/components/providers/require-auth";
import { AppShell } from "@/components/layout/app-shell";
import { ReviewPanel } from "@/components/review/review-panel";

export default function ReviewPage() {
  return (
    <RequireAuth>
      <AppShell
        title="PR & Diff Review"
        description="Automated AI code review for pull requests and patch diffs"
      >
        <ReviewPanel />
      </AppShell>
    </RequireAuth>
  );
}
