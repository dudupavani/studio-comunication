"use client";

import { useCallback, useMemo } from "react";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { useMessages } from "@/hooks/use-messages";
import type { ChatMessageWithSender } from "@/hooks/use-messages";
import { useSendMessage } from "@/hooks/use-send-message";
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";

interface ChatWindowProps {
  chat: Chat;
  chatId: string;
  currentUserId: string;
  members: ChatMemberWithUser[];
  onAttachmentsAdded?: () => void;
}

export function ChatWindow({
  chat,
  chatId,
  currentUserId,
  members,
  onAttachmentsAdded,
}: ChatWindowProps) {
  const { messages, loading, loadingMore, hasMore, loadMore, appendMessage } =
    useMessages(chatId, { limit: 50 });

  const { sending, send } = useSendMessage();

  const memberMap = useMemo(() => {
    const map = new Map<string, ChatMemberWithUser>();
    members.forEach((member) => map.set(member.user_id, member));
    return map;
  }, [members]);

  const handleRealtime = useCallback(
    (message: ChatMessageWithSender) => {
      const senderUser = memberMap.get(message.sender_id)?.user ?? null;
      appendMessage({ ...message, sender: senderUser });
    },
    [appendMessage, memberMap]
  );

  useRealtimeMessages(chatId, handleRealtime);

  const handleSend = useCallback(
    async ({ message, files }: { message: string; files: File[] }) => {
      const result = await send({ chatId, message, attachments: files });
      if (result) {
        const senderUser =
          memberMap.get(result.sender_id)?.user ??
          memberMap.get(currentUserId)?.user ??
          null;
        appendMessage({ ...result, sender: senderUser });
        if (result.attachments && Array.isArray(result.attachments) && result.attachments.length > 0) {
          onAttachmentsAdded?.();
        }
      }
    },
    [appendMessage, chatId, currentUserId, memberMap, onAttachmentsAdded, send]
  );

  return (
    <section className="flex h-full flex-1 flex-col">
      <ChatHeader chat={chat} members={members} />
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
      {!chat.allow_replies ? (
        <div className="border-t border-border px-5 py-2 text-xs text-muted-foreground">
          Respostas desativadas para esta conversa.
        </div>
      ) : null}
      <ChatInput
        onSend={handleSend}
        disabled={sending || !chat.allow_replies}
      />
    </section>
  );
}
