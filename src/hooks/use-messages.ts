"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage, UserMini } from "@/lib/messages/types";

export interface ChatMessageWithSender extends ChatMessage {
  sender?: UserMini | null;
}

interface UseMessagesOptions {
  limit?: number;
}

interface UseMessagesResult {
  messages: ChatMessageWithSender[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => void;
  loadMore: () => void;
  appendMessage: (message: ChatMessageWithSender) => void;
}

export function useMessages(
  chatId: string | null,
  options: UseMessagesOptions = {}
): UseMessagesResult {
  const { toast } = useToast();
  const limit = options.limit ?? 50;

  const [messages, setMessages] = useState<ChatMessageWithSender[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);

  const resolveSenders = useCallback(
    async (ids: string[]): Promise<Record<string, UserMini>> => {
      const unique = Array.from(new Set(ids.filter(Boolean)));
      if (!unique.length) return {};
      try {
        const res = await fetch("/api/identity/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: unique }),
        });
        if (!res.ok) return {};
        const payload = (await res.json()) as {
          byId?: Record<
            string,
            {
              user_id: string;
              full_name: string | null;
              email: string | null;
              avatar_url: string | null;
            }
          >;
        };
        const map: Record<string, UserMini> = {};
        Object.values(payload.byId ?? {}).forEach((row) => {
          map[row.user_id] = {
            id: row.user_id,
            full_name: row.full_name,
            email: row.email,
            avatar_url: row.avatar_url,
          };
        });
        return map;
      } catch (err) {
        console.warn("useMessages identity resolve failed", err);
        return {};
      }
    },
    []
  );

  const appendMessage = useCallback((message: ChatMessageWithSender) => {
    setMessages((prev) => {
      const exists = prev.some((m) => m.id === message.id);
      if (exists) return prev;
      return [...prev, message].sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      );
    });
  }, []);

  const fetchMessages = useCallback(
    async (opts: { cursor?: string; replace?: boolean } = {}) => {
      if (!chatId) return;

      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      if (opts.replace) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (opts.cursor) params.set("cursor", opts.cursor);

        const res = await fetch(
          `/api/chats/${chatId}/messages?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          const message =
            body?.error?.message || `Erro ao carregar mensagens (${res.status})`;
          setError(message);
          toast({
            title: "Erro ao carregar mensagens",
            description: message,
            variant: "destructive",
          });
          return;
        }

        const payload = (await res.json()) as {
          items: ChatMessageWithSender[];
          nextCursor?: string;
        };

        const normalized = [...payload.items].reverse();

        const missingSenderIds = normalized
          .map((m) => m.sender_id)
          .filter((id): id is string => Boolean(id))
          .filter((id, idx, arr) => arr.indexOf(id) === idx)
          .filter((id) => {
            const msg = normalized.find((m) => m.sender_id === id);
            return !msg?.sender?.full_name && !msg?.sender?.email && !msg?.sender?.avatar_url;
          });

        const identityMap = await resolveSenders(missingSenderIds);
        const hydrated = normalized.map((msg) => {
          const identity = msg.sender_id ? identityMap[msg.sender_id] : null;
          if (identity) {
            return { ...msg, sender: identity };
          }
          return msg;
        });

        setMessages((prev) =>
          opts.replace ? hydrated : [...hydrated, ...prev]
        );
        setCursor(payload.nextCursor);
        setHasMore(Boolean(payload.nextCursor));
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("useMessages fetch error", err);
        const message = err?.message ?? "Erro inesperado";
        setError(message);
        toast({
          title: "Erro ao carregar mensagens",
          description: message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setLoadingMore(false);
        abortRef.current = null;
      }
    },
    [chatId, limit, resolveSenders, toast]
  );

  const reload = useCallback(() => fetchMessages({ replace: true }), [
    fetchMessages,
  ]);
  const loadMore = useCallback(() => {
    if (cursor) {
      fetchMessages({ cursor });
    }
  }, [cursor, fetchMessages]);

  useEffect(() => {
    setMessages([]);
    setCursor(undefined);
    setHasMore(false);
    if (chatId) {
      fetchMessages({ replace: true });
    } else {
      setLoading(false);
    }

    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [chatId, fetchMessages]);

  return {
    messages,
    loading,
    loadingMore,
    error,
    hasMore,
    reload,
    loadMore,
    appendMessage,
  };
}
