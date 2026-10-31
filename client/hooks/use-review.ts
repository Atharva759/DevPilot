"use client";

import { useCallback, useRef, useState } from "react";
import { streamReview } from "@/lib/stream-review";
import type { ReviewRequest } from "@/lib/api";
import { toast } from "@/components/ui/toast";

export function useReview() {
  const [reviewText, setReviewText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startReview = useCallback(
    async (endpoint: "diff" | "pr", request: ReviewRequest) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setReviewText("");
      setError(null);
      setIsStreaming(true);

      try {
        await streamReview(endpoint, request, {
          signal: controller.signal,
          onToken: (token) => {
            setReviewText((prev) => prev + token);
          },
          onDone: () => {
            setIsStreaming(false);
          },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const e = err instanceof Error ? err : new Error("Review failed");
        setError(e);
        toast.add({
          title: "Review failed",
          description: e.message,
          type: "error",
        });
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  const stopReview = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setReviewText("");
    setError(null);
    setIsStreaming(false);
  }, []);

  return {
    reviewText,
    isStreaming,
    error,
    startReview,
    stopReview,
    reset,
  };
}
