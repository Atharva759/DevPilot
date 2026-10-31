import { getApiBaseUrl, ApiError, type ReviewRequest } from "@/lib/api";

export type StreamReviewHandlers = {
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

const STREAM_TIMEOUT_MS = 360_000;

export async function streamReview(
  endpoint: "diff" | "pr",
  request: ReviewRequest,
  handlers: StreamReviewHandlers = {}
): Promise<void> {
  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new Error("Review request timed out"));
  }, STREAM_TIMEOUT_MS);

  const onAbort = () => {
    timeoutController.abort(handlers.signal?.reason);
  };

  if (handlers.signal) {
    handlers.signal.addEventListener("abort", onAbort, { once: true });
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/api/review/${endpoint}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
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
      throw new Error("Review response did not contain any analysis text");
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
