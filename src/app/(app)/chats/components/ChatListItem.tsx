"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatSummary, UserMini } from "@/lib/messages/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface ChatListItemProps {
  chat: ChatSummary;
  active?: boolean;
  onSelect?: (chatId: string) => void;
  unreadCount?: number;
}

function initialsFrom(value: string | null | undefined) {
  if (!value) return "C";
  return value
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatBadgeValue(value: number) {
  return value > 99 ? "99+" : String(value);
}

export function ChatListItem({
  chat,
  active,
  onSelect,
  unreadCount = 0,
}: ChatListItemProps) {
  const [creator, setCreator] = useState<UserMini | null>(chat.creator ?? null);

  useEffect(() => {
    if (chat.creator) {
      setCreator(chat.creator);
    }
  }, [chat.creator]);

  useEffect(() => {
    if (creator?.full_name || creator?.email) return;
    if (!chat.created_by) return;

    let canceled = false;
    const resolveIdentity = async () => {
      try {
        const res = await fetch("/api/identity/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: [chat.created_by] }),
        });

        if (!res.ok) return;
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

        if (canceled) return;

        const identity = payload.byId?.[chat.created_by];
        if (identity) {
          setCreator({
            id: identity.user_id,
            full_name: identity.full_name,
            email: identity.email,
            avatar_url: identity.avatar_url,
          });
        }
      } catch {
        // ignore
      }
    };

    resolveIdentity();
    return () => {
      canceled = true;
    };
  }, [chat.created_by, creator?.email, creator?.full_name]);

  const title = chat.name || "Conversa sem título";
  const lastMessageText = chat.last_message?.message || "Sem mensagens";
  const creatorName =
    creator?.full_name?.trim() ||
    creator?.email?.trim() ||
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
      <div className="flex items-start gap-3">
        <div className="relative">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={creator?.avatar_url ?? undefined}
              alt={creatorName ?? undefined}
            />
            <AvatarFallback>{initialsFrom(title)}</AvatarFallback>
          </Avatar>
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-[20px] min-h-[20px] max-w-[20px] max-h-[20px] rounded-full bg-green-600 text-[11px] font-semibold text-center border border-white shadow-sm text-white ">
              {formatBadgeValue(unreadCount)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col gap-0">
          <div className="flex items-center justify-between mb-1">
            <h6 className="line-clamp-1">{title}</h6>
            {relativeTime ? (
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {relativeTime}
              </span>
            ) : null}
          </div>
          {creatorName ? (
            <span className="truncate text-xs">{creatorName}</span>
          ) : null}
          <p className="text-xs text-muted-foreground leading-5 line-clamp-2 mt-2 whitespace-break-spaces">
            {lastMessageText}
          </p>
        </div>
      </div>
    </button>
  );
}
