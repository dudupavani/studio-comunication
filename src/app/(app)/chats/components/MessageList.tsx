"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import type { ChatMessageWithSender } from "@/hooks/use-messages";
import type { ChatMemberWithUser } from "./types";
import { Button } from "@/components/ui/button";
import { MessageItem } from "./MessageItem";

interface MessageListProps {
  messages: ChatMessageWithSender[];
  currentUserId: string;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  members: ChatMemberWithUser[];
}

export function MessageList({
  messages,
  currentUserId,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  members,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!bottomRef.current) return;
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50"
      style={{ scrollBehavior: "smooth" }}>
      <div className="flex flex-col gap-6">
        {hasMore && (
          <Button
            variant="outline"
            size="sm"
            className="self-center"
            onClick={onLoadMore}
            disabled={loadingMore}>
            {loadingMore ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </span>
            ) : (
              "Carregar mensagens anteriores"
            )}
          </Button>
        )}

        {messages.length === 0 && !loading ? (
          <div className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Sem mensagens ainda. Diga olá 👋
          </div>
        ) : null}

        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            isOwn={message.sender_id === currentUserId}
            members={members}
            currentUserId={currentUserId}
          />
        ))}

        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando mensagens...
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
