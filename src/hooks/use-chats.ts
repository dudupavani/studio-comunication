"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ChatSummary } from "@/lib/messages/types";

interface UseChatsOptions {
  limit?: number;
  filters?: Record<string, never>;
}

interface UseChatsResult {
  chats: ChatSummary[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  reload: () => void;
  loadMore: () => void;
}

export function useChats(options: UseChatsOptions = {}): UseChatsResult {
  const limit = options.limit ?? 30;
  const { toast } = useToast();
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState<boolean>(false);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const focusRef = useRef<boolean>(false);

  const filtersKey = JSON.stringify(options.filters ?? {});

  const fetchPage = useCallback(
    (opts: { cursor?: string; replace?: boolean } = {}) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(async () => {
        if (abortRef.current) {
          abortRef.current.abort();
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
          const params = new URLSearchParams();
          params.set("limit", String(limit));
          if (opts.cursor) params.set("cursor", opts.cursor);

          const parsedFilters = JSON.parse(filtersKey) as Record<
            string,
            string | number | boolean
          >;
          Object.entries(parsedFilters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              params.set(key, String(value));
            }
          });

          const res = await fetch(`/api/messages/chats?${params.toString()}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            const body = (await res.json().catch(() => null)) as any;
            const message =
              body?.error?.message || `Erro ao carregar conversas (${res.status})`;
            setError(message);
            toast({
              title: "Falha ao carregar conversas",
              description: message,
              variant: "destructive",
            });
            return;
          }

          const payload = (await res.json()) as {
            items: ChatSummary[];
            nextCursor?: string;
          };

          setChats((prev) =>
            opts.replace ? payload.items : [...prev, ...payload.items]
          );
          setNextCursor(payload.nextCursor);
          setHasMore(Boolean(payload.nextCursor));
        } catch (err: any) {
          if (err?.name === "AbortError") return;
          console.error("useChats fetch error", err);
          const message = err?.message ?? "Erro inesperado";
          setError(message);
          toast({
            title: "Erro ao carregar conversas",
            description: message,
            variant: "destructive",
          });
        } finally {
          setLoading(false);
          abortRef.current = null;
        }
      }, focusRef.current ? 0 : 200);
    },
    [filtersKey, limit, toast]
  );

  const reload = useCallback(() => fetchPage({ replace: true }), [fetchPage]);
  const loadMore = useCallback(() => {
    if (nextCursor) {
      fetchPage({ cursor: nextCursor });
    }
  }, [fetchPage, nextCursor]);

  useEffect(() => {
    setChats([]);
    setNextCursor(undefined);
    setHasMore(false);
    setError(null);
    focusRef.current = true;
    fetchPage({ replace: true });
    focusRef.current = false;
  }, [fetchPage]);

  useEffect(() => {
    const onVisibility = () => {
      if (!document.hidden) {
        focusRef.current = true;
        fetchPage({ replace: true });
        focusRef.current = false;
      }
    };
    window.addEventListener("visibilitychange", onVisibility);
    return () => window.removeEventListener("visibilitychange", onVisibility);
  }, [fetchPage]);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    chats,
    loading,
    error,
    hasMore,
    reload,
    loadMore,
  };
}
