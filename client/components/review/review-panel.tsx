"use client";

import { useState } from "react";
import { GitPullRequest, FileDiff, Sparkles, StopCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useReview } from "@/hooks/use-review";
import { ReviewResult } from "@/components/review/review-result";
import { useRepos } from "@/hooks/use-repos";

export function ReviewPanel() {
  const [activeTab, setActiveTab] = useState<"pr" | "diff">("pr");
  const [prUrl, setPrUrl] = useState("");
  const [diffText, setDiffText] = useState("");
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");

  const { repos } = { repos: useRepos().data ?? [] };
  const { reviewText, isStreaming, error, startReview, stopReview, reset } = useReview();

  const handleStartReview = async () => {
    if (activeTab === "pr") {
      if (!prUrl.trim()) return;
      await startReview("pr", {
        prUrl: prUrl.trim(),
        repoId: selectedRepoId || undefined,
      });
    } else {
      if (!diffText.trim()) return;
      await startReview("diff", {
        diff: diffText.trim(),
        repoId: selectedRepoId || undefined,
      });
    }
  };

  const isInputEmpty = activeTab === "pr" ? !prUrl.trim() : !diffText.trim();
  const hasResult = Boolean(reviewText || isStreaming || error);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">AI PR & Diff Review</h1>
        <p className="text-sm text-muted-foreground">
          Analyze unified diffs or GitHub pull requests for style issues, potential bugs, missing tests, and security risks.
        </p>
      </div>

      {!hasResult ? (
        <Card className="shadow-xs">
          <CardHeader>
            <CardTitle>Submit Changes for Review</CardTitle>
            <CardDescription>
              Provide either a public/authenticated GitHub pull request URL or paste a raw git diff.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "pr" | "diff")}>
              <TabsList className="grid w-full grid-cols-2 max-w-xs">
                <TabsTrigger value="pr" className="gap-2">
                  <GitPullRequest className="size-4" />
                  GitHub PR URL
                </TabsTrigger>
                <TabsTrigger value="diff" className="gap-2">
                  <FileDiff className="size-4" />
                  Paste Diff
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pr" className="space-y-4 pt-3">
                <div className="space-y-2">
                  <label htmlFor="pr-url" className="text-sm font-medium">
                    Pull Request URL
                  </label>
                  <Input
                    id="pr-url"
                    placeholder="https://github.com/owner/repo/pull/42 or owner/repo#42"
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    disabled={isStreaming}
                  />
                  <p className="text-xs text-muted-foreground">
                    DevPilot will fetch the unified diff using your GitHub connection.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="diff" className="space-y-4 pt-3">
                <div className="space-y-2">
                  <label htmlFor="diff-content" className="text-sm font-medium">
                    Unified Diff Content
                  </label>
                  <Textarea
                    id="diff-content"
                    rows={12}
                    className="font-mono text-xs"
                    placeholder={"diff --git a/src/index.ts b/src/index.ts\nindex 83a21..b903f 100644\n--- a/src/index.ts\n+++ b/src/index.ts\n@@ -1,5 +1,7 @@\n+import { sanitize } from './utils';"}
                    value={diffText}
                    onChange={(e) => setDiffText(e.target.value)}
                    disabled={isStreaming}
                  />
                </div>
              </TabsContent>
            </Tabs>

            {repos.length > 0 && (
              <div className="space-y-2 max-w-sm pt-1">
                <label htmlFor="repo-select" className="text-xs font-medium text-muted-foreground">
                  Associated Repository (optional context)
                </label>
                <select
                  id="repo-select"
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring"
                  value={selectedRepoId}
                  onChange={(e) => setSelectedRepoId(e.target.value)}
                  disabled={isStreaming}
                >
                  <option value="">None / Auto-detect</option>
                  {repos.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.fullName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                onClick={handleStartReview}
                disabled={isInputEmpty || isStreaming}
                className="gap-2"
              >
                {isStreaming ? (
                  <>
                    <RefreshCw className="size-4 animate-spin" />
                    Reviewing…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Start AI Review
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Reviewing: {activeTab === "pr" ? prUrl : "Custom Git Diff"}
            </span>
            {isStreaming && (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopReview}
                className="gap-1.5"
              >
                <StopCircle className="size-4" />
                Stop Generation
              </Button>
            )}
          </div>

          <ReviewResult
            content={reviewText}
            isStreaming={isStreaming}
            error={error}
            onReset={reset}
          />
        </div>
      )}
    </div>
  );
}
