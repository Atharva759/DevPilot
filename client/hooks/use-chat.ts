"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, type ChatMessage } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { streamChatMessage } from "@/lib/stream-chat";
import { toast } from "@/components/ui/toast";

export function useChatSessions(repositoryId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.chat.sessions(repositoryId),
    queryFn: () => api.listSessions(repositoryId),
    enabled: Boolean(repositoryId) && enabled,
  });
}

export function useChatMessages(
  sessionId: string | null,
  isStreaming = false,
  awaitingReply = false
) {
  return useQuery({
    queryKey: queryKeys.chat.messages(sessionId ?? ""),
    queryFn: () => api.getMessages(sessionId!),
    enabled: Boolean(sessionId),
    refetchInterval: isStreaming || awaitingReply ? 1000 : false,
    refetchIntervalInBackground: false,
  });
}

export function useCreateChatSession(repositoryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (title?: string) => api.createSession(repositoryId, title),
    onSuccess: (session) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chat.sessions(repositoryId),
      });
      queryClient.setQueryData(queryKeys.chat.messages(session.id), []);
    },
    onError: (error: Error) => {
      toast.add({
        title: "Could not create chat",
        description: error.message,
        type: "error",
      });
    },
  });
}

export function useStreamChat(sessionId: string | null) {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const [awaitingReply, setAwaitingReply] = useState(false);
  const [streamText, setStreamText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const replyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finishWaitingForReply = useCallback(() => {
    setAwaitingReply(false);
    if (replyTimeoutRef.current) {
      clearTimeout(replyTimeoutRef.current);
      replyTimeoutRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
      }
    },
    []
  );

  const send = useCallback(
    async (content: string) => {
      if (!sessionId || !content.trim() || streaming) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const optimisticId = `temp-${Date.now()}`;
      const optimistic: ChatMessage = {
        id: optimisticId,
        role: "USER",
        content: content.trim(),
        citations: [],
        createdAt: new Date().toISOString(),
      };

      const messagesKey = queryKeys.chat.messages(sessionId);
      await queryClient.cancelQueries({ queryKey: messagesKey, exact: true });
      queryClient.setQueryData<ChatMessage[]>(
        messagesKey,
        (prev) => [...(prev ?? []), optimistic]
      );

      setStreaming(true);
      setAwaitingReply(true);
      if (replyTimeoutRef.current) {
        clearTimeout(replyTimeoutRef.current);
      }
      replyTimeoutRef.current = setTimeout(() => {
        setAwaitingReply(false);
        replyTimeoutRef.current = null;
      }, 120_000);
      setStreamText("");

      const refreshMessages = async () => {
        const messages = await api.getMessages(sessionId);
        await queryClient.cancelQueries({ queryKey: messagesKey, exact: true });
        queryClient.setQueryData(messagesKey, messages);
      };

      try {
        await streamChatMessage(sessionId, content.trim(), {
          signal: controller.signal,
          onUserMessage: (message) => {
            queryClient.setQueryData<ChatMessage[]>(
              messagesKey,
              (prev) => [
                ...(prev ?? []).filter((m) => m.id !== optimisticId),
                message,
              ]
            );
          },
          onToken: (token) => {
            setStreamText((prev) => prev + token);
          },
          onAssistantMessage: (message) => {
            queryClient.setQueryData<ChatMessage[]>(
              messagesKey,
              (prev) => {
                const messages = prev ?? [];
                return messages.some((existing) => existing.id === message.id)
                  ? messages
                  : [...messages, message];
              }
            );
            setStreamText("");
          },
        });
        await refreshMessages();
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          void refreshMessages().catch((refreshError: unknown) => {
            toast.add({
              title: "Could not refresh chat",
              description:
                refreshError instanceof Error
                  ? refreshError.message
                  : "Unknown error",
              type: "error",
            });
          });
          return;
        }
        toast.add({
          title: "Message failed",
          description: err instanceof Error ? err.message : "Unknown error",
          type: "error",
        });
        queryClient.setQueryData<ChatMessage[]>(
          messagesKey,
          (prev) => (prev ?? []).filter((m) => m.id !== optimisticId)
        );
        setStreamText("");
        void refreshMessages().catch((refreshError: unknown) => {
          toast.add({
            title: "Could not refresh chat",
            description:
              refreshError instanceof Error
                ? refreshError.message
                : "Unknown error",
            type: "error",
          });
        });
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setStreaming(false);
        }
      }
    },
    [sessionId, streaming, queryClient]
  );

  const stop = useCallback(() => {
    const controller = abortRef.current;
    abortRef.current = null;
    controller?.abort();
    setStreaming(false);
  }, []);

  return { send, stop, streaming, awaitingReply, finishWaitingForReply, streamText };
}