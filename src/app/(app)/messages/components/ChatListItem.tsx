"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatSummary } from "@/lib/messages/types";

export interface ChatListItemProps {
  chat: ChatSummary;
  active?: boolean;
  onSelect?: (chatId: string) => void;
}

export function ChatListItem({ chat, active, onSelect }: ChatListItemProps) {
  const title = chat.name || "Conversa sem título";
  const lastMessageText = chat.last_message?.message || "Sem mensagens";
  const relativeTime = chat.last_message?.created_at
    ? formatDistanceToNow(new Date(chat.last_message.created_at), {
        addSuffix: true,
      })
    : null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(chat.id)}
      className={cn(
        "w-full border-b border-transparent px-3 py-3 text-left transition-colors",
        active
          ? "bg-primary/10 border-primary border-b-2"
          : "hover:bg-muted border-border"
      )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground line-clamp-1 whitespace-break-spaces">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1 whitespace-break-spaces">
            {lastMessageText}
          </p>
        </div>
        {relativeTime ? (
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {relativeTime}
          </span>
        ) : null}
      </div>
    </button>
  );
}
