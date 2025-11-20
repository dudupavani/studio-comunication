"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatMessageWithSender } from "@/hooks/use-messages";
import { Paperclip } from "lucide-react";

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
      )}>
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
      {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
        <div className="mt-1 flex max-w-[75%] flex-col gap-2">
          {message.attachments.map((att: any) => {
            const isImage =
              typeof att?.mime === "string"
                ? att.mime.startsWith("image/")
                : typeof att?.name === "string"
                ? /\.(png|jpe?g|gif|webp|svg)$/i.test(att.name)
                : false;

            return (
              <a
                key={att.path}
                href={att.url ?? att.path}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "flex items-center max-w-xs gap-2 rounded-lg border px-3 py-3 text-xs transition hover:bg-muted shadow-sm hover:shadow-md",
                  isOwn ? "border-primary/40" : "border-border"
                )}>
                {isImage && att.url ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-md bg-muted">
                    <img
                      src={att.url}
                      alt={att.name || "Anexo"}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <div className="flex-1 ">
                  <div className="line-clamp-2 font-medium text-foreground">
                    {att.name || "Anexo"}
                  </div>
                  {att.size ? (
                    <div className="text-[11px] text-muted-foreground">
                      {(att.size / 1024).toFixed(1)} KB
                    </div>
                  ) : null}
                </div>
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
