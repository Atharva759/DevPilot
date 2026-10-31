import { getApiBaseUrl, ApiError, type ChatMessage } from "@/lib/api";

export type StreamChatHandlers = {
  onUserMessage?: (message: ChatMessage) => void;
  onToken?: (token: string) => void;
  onAssistantMessage?: (message: ChatMessage) => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
  signal?: AbortSignal;
};

const FETCH_TIMEOUT_MS = 90_000;

export async function streamChatMessage(
  sessionId: string,
  content: string,
  handlers: StreamChatHandlers = {}
): Promise<void> {
  if (handlers.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    timeoutController.abort(new Error("Chat request timed out after 90 seconds"));
  }, FETCH_TIMEOUT_MS);
  const onAbort = () => timeoutController.abort(handlers.signal?.reason);
  handlers.signal?.addEventListener("abort", onAbort, { once: true });
  let receivedAssistantMessage = false;
  let receivedDone = false;

  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/chat/sessions/${sessionId}/messages`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: timeoutController.signal,
      }
    );

    if (!res.ok) {
      let message = res.statusText;
      try {
        const data = await res.json();
        message = data.message ?? data.error ?? message;
      } catch {
        // The response may not contain JSON.
      }
      throw new ApiError(res.status, message);
    }

    if (!res.body) {
      throw new Error("No response body for SSE stream");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        processEvent(part);
      }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
      processEvent(buffer);
    }

    if (!receivedAssistantMessage || !receivedDone) {
      throw new Error("Chat stream ended before the answer was complete");
    }

    handlers.onDone?.();
  } catch (err) {
    if (handlers.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    if (timeoutController.signal.aborted) {
      const reason = timeoutController.signal.reason;
      throw reason instanceof Error
        ? reason
        : new Error("Chat request timed out after 90 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timer);
    handlers.signal?.removeEventListener("abort", onAbort);
  }

  function processEvent(part: string) {
    if (!part.trim()) return;

    const lines = part.split(/\r\n|\r|\n/);
    let event = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    const data = dataLines.join("\n");
    if (!data) return;

    if (event === "error") {
      throw new Error(data);
    }
    if (event === "token") {
      handlers.onToken?.(JSON.parse(data) as string);
    } else if (event === "user_message") {
      handlers.onUserMessage?.(JSON.parse(data) as ChatMessage);
    } else if (event === "assistant_message") {
      handlers.onAssistantMessage?.(JSON.parse(data) as ChatMessage);
      receivedAssistantMessage = true;
    } else if (event === "done") {
      receivedDone = true;
    }
  }
}