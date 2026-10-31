import { getApiBaseUrl, ApiError } from "@/lib/api";

export type StreamLogHandlers = {
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

const STREAM_TIMEOUT_MS = 360_000;

export async function streamLogAnalysis(
  source: { type: "text"; content: string } | { type: "file"; file: File },
  handlers: StreamLogHandlers = {}
): Promise<void> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new Error("Log analysis timed out"));
  }, STREAM_TIMEOUT_MS);

  const onAbort = () => {
    timeoutController.abort(handlers.signal?.reason);
  };

  if (handlers.signal) {
    handlers.signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const isFile = source.type === "file";
    const endpoint = isFile ? "/api/logs/analyze/upload" : "/api/logs/analyze";
    
    let body: BodyInit;
    const headers: Record<string, string> = {};

    if (isFile) {
      const formData = new FormData();
      formData.append("file", source.file);
      body = formData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ logContent: source.content });
    }

    const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers,
      body,
      signal: timeoutController.signal,
    });

    if (!res.ok) {
      let message = res.statusText;
      try {
        const data = await res.json();
        message = data.message ?? data.error ?? message;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, message);
    }

    const data: unknown = await res.json();
    const content =
      typeof data === "object" && data !== null && "content" in data
        ? data.content
        : null;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Log analysis response did not contain any analysis text");
    }

    handlers.onToken?.(content);
    handlers.onDone?.();
  } finally {
    clearTimeout(timer);
    if (handlers.signal) {
      handlers.signal.removeEventListener("abort", onAbort);
    }
  }
}
