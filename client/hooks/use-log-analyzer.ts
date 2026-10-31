"use client";

import { useCallback, useRef, useState } from "react";
import { streamLogAnalysis } from "@/lib/stream-logs";
import { toast } from "@/components/ui/toast";

export function useLogAnalyzer() {
  const [analysisText, setAnalysisText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const startAnalysis = useCallback(
    async (source: { type: "text"; content: string } | { type: "file"; file: File }) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setAnalysisText("");
      setError(null);
      setIsAnalyzing(true);

      try {
        await streamLogAnalysis(source, {
          signal: controller.signal,
          onToken: (token) => {
            setAnalysisText((prev) => prev + token);
          },
          onDone: () => {
            setIsAnalyzing(false);
          },
        });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const e = err instanceof Error ? err : new Error("Analysis failed");
        setError(e);
        toast.add({
          title: "Log analysis failed",
          description: e.message,
          type: "error",
        });
      } finally {
        setIsAnalyzing(false);
      }
    },
    []
  );

  const analyzeText = useCallback(
    (content: string) => startAnalysis({ type: "text", content }),
    [startAnalysis]
  );

  const analyzeFile = useCallback(
    (file: File) => startAnalysis({ type: "file", file }),
    [startAnalysis]
  );

  const stopAnalysis = useCallback(() => {
    abortRef.current?.abort();
    setIsAnalyzing(false);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setAnalysisText("");
    setError(null);
    setIsAnalyzing(false);
  }, []);

  return {
    analysisText,
    isAnalyzing,
    error,
    analyzeText,
    analyzeFile,
    stopAnalysis,
    reset,
  };
}
