"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatMessageWithSender } from "@/hooks/use-messages";

interface MessageItemProps {
  message: ChatMessageWithSender;
  isOwn: boolean;
}

export function MessageItem({ message, isOwn }: MessageItemProps) {
  const time = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
  });

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1",
        isOwn ? "items-end" : "items-start"
      )}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {!isOwn && message.sender?.full_name ? (
          <span className="font-medium text-foreground">
            {message.sender.full_name}
          </span>
        ) : null}
        <span>{time}</span>
      </div>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm",
          isOwn
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
        dangerouslySetInnerHTML={{ __html: message.message }}
      />
    </div>
  );
}
