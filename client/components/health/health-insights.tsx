"use client";

import { Activity, AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { HealthInsight } from "@/lib/api";

const severityVariants: Record<
  HealthInsight["severity"],
  "destructive" | "secondary" | "outline"
> = {
  HIGH: "destructive",
  MEDIUM: "secondary",
  LOW: "outline",
  INFO: "outline",
};

const categoryLabels: Record<HealthInsight["category"], string> = {
  TESTING: "Testing",
  CI: "CI",
  DEPENDENCIES: "Dependencies",
  SECURITY: "Security",
  REPOSITORY: "Repository",
};

function SeverityIcon({ severity }: { severity: HealthInsight["severity"] }) {
  if (severity === "HIGH") return <ShieldAlert className="size-4 text-destructive" />;
  if (severity === "MEDIUM") return <AlertTriangle className="size-4 text-amber-500" />;
  if (severity === "INFO") return <Info className="size-4 text-blue-500" />;
  return <Activity className="size-4 text-muted-foreground" />;
}

export function HealthInsights({ insights }: { insights: HealthInsight[] }) {
  const highCount = insights.filter((insight) => insight.severity === "HIGH").length;
  const mediumCount = insights.filter((insight) => insight.severity === "MEDIUM").length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">Repository Signals & Risks</CardTitle>
            <CardDescription>
              Static checks from tracked file paths; this is not a vulnerability scan.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge variant="destructive">{highCount} high</Badge>
            <Badge variant="secondary">{mediumCount} medium</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center">
            <Activity className="size-8 text-emerald-500" />
            <p className="font-medium">No structural risks detected</p>
            <p className="max-w-lg text-xs text-muted-foreground">
              The checks covered test files, CI configuration, Node lockfiles, tracked environment-file names,
              security policy documentation, and large committed files.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {insights.map((insight, index) => (
              <li key={`${insight.category}-${insight.title}-${index}`} className="flex gap-3 py-4 first:pt-1 last:pb-1">
                <div className="mt-0.5">
                  <SeverityIcon severity={insight.severity} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{insight.title}</p>
                    <Badge variant={severityVariants[insight.severity]} className="text-[10px]">
                      {insight.severity}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {categoryLabels[insight.category]}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{insight.description}</p>
                  {insight.evidencePath && (
                    <p className="break-words font-mono text-[11px] text-foreground/70">
                      Evidence: {insight.evidencePath}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
