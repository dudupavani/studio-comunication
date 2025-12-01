"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type BadgeCounts = {
  inbox: number;
  chats: number;
};

type ChatNotificationMap = Record<
  string,
  { count: number; lastNotificationAt: string | null }
>;

export type BadgeScope = keyof BadgeCounts;

const DEFAULT_COUNTS: BadgeCounts = {
  inbox: 0,
  chats: 0,
};

interface UseNotificationBadgesOptions {
  pollMs?: number;
  enabled?: boolean;
  userId?: string | null;
}

function dispatchNotificationRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("notifications:refresh"));
  }
}

export function useNotificationBadges(
  options: UseNotificationBadgesOptions = {}
) {
  const { pollMs = 30_000, enabled = true, userId = null } = options;
  const [counts, setCounts] = useState<BadgeCounts>(DEFAULT_COUNTS);
  const [chatMap, setChatMap] = useState<ChatNotificationMap>({});
  const [loading, setLoading] = useState<boolean>(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchCounts = useCallback(async () => {
    if (!enabled) {
      setCounts(DEFAULT_COUNTS);
      setChatMap({});
      setLoading(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/notifications/badges", {
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Badge fetch failed (${res.status})`);
      }

      const payload = (await res.json().catch(() => ({}))) as Partial<
        BadgeCounts & { chatMap: ChatNotificationMap }
      >;
      setCounts({
        inbox: Math.max(0, payload.inbox ?? 0),
        chats: Math.max(0, payload.chats ?? 0),
      });
      setChatMap(payload.chatMap ?? {});
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.warn("notifications badge fetch error:", err);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  }, [enabled]);

  const markScopeAsRead = useCallback(
    async (scope: BadgeScope) => {
      if (!enabled) return;
      try {
        const res = await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope }),
        });
        if (!res.ok) {
          throw new Error(`Mark read failed (${res.status})`);
        }
        dispatchNotificationRefresh();
        await fetchCounts();
      } catch (err) {
        console.warn("notifications mark-read error:", err);
      }
    },
    [enabled, fetchCounts]
  );

  const markChatAsRead = useCallback(
    async (chatId: string | null | undefined) => {
      if (!enabled || !chatId) return;
      try {
        const res = await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "chat", chatId }),
        });
        if (!res.ok) {
          throw new Error(`Mark chat read failed (${res.status})`);
        }
        dispatchNotificationRefresh();
        await fetchCounts();
      } catch (err) {
        console.warn("notifications mark-chat error:", err);
      }
    },
    [enabled, fetchCounts]
  );

  useEffect(() => {
    if (!enabled) {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      setCounts(DEFAULT_COUNTS);
      setChatMap({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchCounts();
    const interval = setInterval(() => {
      if (!cancelled) {
        fetchCounts();
      }
    }, pollMs);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
    };
  }, [enabled, fetchCounts, pollMs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => fetchCounts();
    window.addEventListener("notifications:refresh", handler);
    return () => window.removeEventListener("notifications:refresh", handler);
  }, [fetchCounts]);

  useEffect(() => {
    if (!enabled || !userId) return;
    const channel = supabase
      .channel(`notifications-badges-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, fetchCounts, userId]);

  return {
    counts,
    chatMap,
    loading,
    refresh: fetchCounts,
    markScopeAsRead,
    markChatAsRead,
  };
}
