"use client";

import { useState } from "react";
import { FolderGit2, Database, FileCode2, Layers, AlertOctagon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRepos } from "@/hooks/use-repos";
import { useRepoHealth } from "@/hooks/use-health";
import { CoverageChart } from "@/components/health/coverage-chart";
import { DocGapsTable } from "@/components/health/doc-gaps-table";
import { QueriedModulesChart } from "@/components/health/queried-modules";
import { HealthInsights } from "@/components/health/health-insights";

export function HealthDashboard() {
  const { data: repos, isLoading: isReposLoading } = useRepos();
  const [selectedRepoId, setSelectedRepoId] = useState<string | null>(null);

  const activeRepoId =
    selectedRepoId ?? (repos && repos.length > 0 ? repos[0].id : null);

  const { data: health, isLoading: isHealthLoading, error } = useRepoHealth(activeRepoId);

  if (isReposLoading) {
    return (
      <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!repos || repos.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12 text-center">
        <FolderGit2 className="size-10 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">No repositories found</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Connect your GitHub account and index a repository to view codebase health metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
      {/* Header and Repo Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repository Health</h1>
          <p className="text-sm text-muted-foreground">
            Monitor indexing, documentation, tests, dependencies, CI setup, and repository risks.
          </p>
        </div>

        <div className="w-full sm:w-72">
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-ring"
            value={activeRepoId ?? ""}
            onChange={(e) => setSelectedRepoId(e.target.value)}
          >
            {repos.map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isHealthLoading ? (
        <div className="flex flex-1 flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-80 rounded-xl" />
            <Skeleton className="h-80 rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <Card className="border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm font-medium text-destructive">
            Failed to load health metrics: {(error as Error).message}
          </p>
        </Card>
      ) : health ? (
        <div className="flex flex-1 flex-col gap-6">
          {/* Summary KPIs */}
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Embedding Coverage
                </CardTitle>
                <Database className="size-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health.embeddingCoverage}%</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Vector index completeness
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Indexed Files
                </CardTitle>
                <FileCode2 className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {health.indexedFiles} <span className="text-sm font-normal text-muted-foreground">/ {health.totalFiles}</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Codebase eligible files
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Vector Chunks
                </CardTitle>
                <Layers className="size-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health.chunkCount.toLocaleString()}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  pgvector embeddings stored
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  Documentation Gaps
                </CardTitle>
                <AlertOctagon className="size-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{health.docGaps.length}</div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Areas needing documentation
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            <CoverageChart
              coverage={health.embeddingCoverage}
              indexedFiles={health.indexedFiles}
              totalFiles={health.totalFiles}
            />
            <QueriedModulesChart modules={health.topQueriedModules} />
          </div>

          {/* Doc Gaps Table */}
          <DocGapsTable docGaps={health.docGaps} />
          <HealthInsights insights={health.insights ?? []} />
        </div>
      ) : null}
    </div>
  );
}
