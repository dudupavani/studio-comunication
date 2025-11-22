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
        (payload) => {
          const row = payload.new as any;
          if (!row) return;
          const message: ChatMessageWithSender = {
            id: row.id,
            chat_id: row.chat_id,
            sender_id: row.sender_id,
            message: row.message,
            attachments: row.attachments,
            created_at: row.created_at,
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
