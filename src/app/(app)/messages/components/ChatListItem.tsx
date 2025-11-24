"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatSummary } from "@/lib/messages/types";
import { User } from "lucide-react";
export interface ChatListItemProps {
  chat: ChatSummary;
  active?: boolean;
  onSelect?: (chatId: string) => void;
}

export function ChatListItem({ chat, active, onSelect }: ChatListItemProps) {
  const title = chat.name || "Conversa sem título";
  const lastMessageText = chat.last_message?.message || "Sem mensagens";
  const creatorName =
    chat.creator?.full_name?.trim() ||
    chat.creator?.email?.trim() ||
    chat.created_by ||
    null;
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
        "w-full border-b border-transparent p-4 text-left transition-colors",
        active
          ? "bg-primary/10 border-primary border-r-2"
          : "hover:bg-muted border-border"
      )}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h6 className="line-clamp-1">{title}</h6>
          {creatorName ? (
            <p className="flex gap-1 truncate items-center text-xs mt-0.5 whitespace-break-spaces">
              <div className="min-h-4 min-w-4">
                <User size={14} />
              </div>
              {creatorName}
            </p>
          ) : null}
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2 whitespace-break-spaces">
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
