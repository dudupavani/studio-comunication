"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import type { ChatMessageWithSender } from "./use-messages";

export function useRealtimeMessages(
  chatId: string | null,
  onMessage: (message: ChatMessageWithSender) => void
) {
  useEffect(() => {
    if (!chatId) return;

    async function fetchMentions(messageId: number): Promise<ChatMessageWithSender["mentions"]> {
      const { data, error } = await supabase
        .from("chat_message_mentions")
        .select(
          `id, message_id, type, mentioned_user_id, raw_label,
           profiles:mentioned_user_id (id, full_name, avatar_url)
          `
        )
        .eq("message_id", messageId)
        .order("id", { ascending: true });

      if (error) {
        console.warn("useRealtimeMessages mention fetch error", error);
        return [];
      }

      return (data ?? []).map((row: any) => ({
        id: row.id,
        type: row.type,
        mentioned_user_id: row.mentioned_user_id,
        raw_label: row.raw_label ?? null,
        user: row.profiles
          ? {
              id: row.profiles.id,
              full_name: row.profiles.full_name,
              avatar_url: row.profiles.avatar_url,
            }
          : null,
      }));
    }

    const channel = supabase
      .channel(`messages-chat-${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const row = payload.new as any;
          if (!row) return;
          const mentions = await fetchMentions(row.id);
          const message: ChatMessageWithSender = {
            id: row.id,
            chat_id: row.chat_id,
            sender_id: row.sender_id,
            message: row.message,
            attachments: row.attachments,
            created_at: row.created_at,
            mentions,
            sender: undefined,
          };
          onMessage(message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, onMessage]);
}
