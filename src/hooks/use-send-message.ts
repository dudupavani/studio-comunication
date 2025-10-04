"use client";

import { useCallback, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { ChatMessage } from "@/lib/helpdesk/types";
import type { ChatMessageWithSender } from "./use-messages";

interface SendOptions {
  chatId: string;
  message: string;
  attachments?: any;
}

interface UseSendMessageResult {
  sending: boolean;
  send: (
    options: SendOptions
  ) => Promise<ChatMessageWithSender | null>;
}

export function useSendMessage(): UseSendMessageResult {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  const send = useCallback(
    async ({ chatId, message, attachments }: SendOptions) => {
      if (!chatId) return null;
      const trimmed = message.trim();
      if (!trimmed) return null;

      setSending(true);
      try {
        const res = await fetch(`/api/helpdesk/chats/${chatId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, attachments }),
        });

        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          const description =
            body?.error?.message || `Erro ao enviar mensagem (${res.status})`;
          toast({
            title: "Erro ao enviar",
            description,
            variant: "destructive",
          });
          return null;
        }

        const payload = (await res.json()) as ChatMessageWithSender;
        return payload;
      } catch (err: any) {
        console.error("useSendMessage error", err);
        toast({
          title: "Erro ao enviar",
          description: err?.message ?? "Erro inesperado",
          variant: "destructive",
        });
        return null;
      } finally {
        setSending(false);
      }
    },
    [toast]
  );

  return { sending, send };
}
