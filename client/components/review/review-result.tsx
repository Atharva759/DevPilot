"use client";

import { Check, Copy, ShieldAlert, Bug, Sparkles, TestTube2, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMarkdown } from "@/components/chat/chat-markdown";

export function ReviewResult({
  content,
  isStreaming,
  error,
  onReset,
}: {
  content: string;
  isStreaming: boolean;
  error: Error | null;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <Card className="flex flex-1 flex-col overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b py-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base font-semibold">Review Analysis</CardTitle>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-blue-500/30 text-blue-500 bg-blue-500/10">
              <Sparkles className="mr-1 size-3" />
              Style
            </Badge>
            <Badge variant="outline" className="border-red-500/30 text-red-500 bg-red-500/10">
              <Bug className="mr-1 size-3" />
              Bugs
            </Badge>
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-500 bg-yellow-500/10">
              <TestTube2 className="mr-1 size-3" />
              Tests
            </Badge>
            <Badge variant="outline" className="border-orange-500/30 text-orange-500 bg-orange-500/10">
              <ShieldAlert className="mr-1 size-3" />
              Security
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!content || isStreaming}
            title="Copy Review Markdown"
          >
            {copied ? <Check className="mr-1.5 size-3.5" /> : <Copy className="mr-1.5 size-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            title="Start New Review"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-6">
        {content ? (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ChatMarkdown content={content} isStreaming={isStreaming} />
            {isStreaming && (
              <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" />
            )}
          </div>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive">
            Review failed: {error.message}
          </p>
        ) : (
          isStreaming && (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <span className="size-2 animate-ping rounded-full bg-primary" />
              <span>Analyzing diff and evaluating changes across security, bugs, tests, and style…</span>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}
