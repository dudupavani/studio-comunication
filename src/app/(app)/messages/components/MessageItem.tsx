"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ChatMessageWithSender } from "@/hooks/use-messages";
import type { UserMini } from "@/lib/messages/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip } from "lucide-react";

interface MessageItemProps {
  message: ChatMessageWithSender;
  isOwn: boolean;
}

export function MessageItem({ message, isOwn }: MessageItemProps) {
  const [sender, setSender] = useState<UserMini | null>(message.sender ?? null);

  useEffect(() => {
    setSender(message.sender ?? null);
  }, [message.sender]);

  useEffect(() => {
    if ((sender?.full_name || sender?.email) && sender?.id) {
      return;
    }
    if (!message.sender_id) return;

    let canceled = false;
    const resolveIdentity = async () => {
      try {
        const res = await fetch("/api/identity/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userIds: [message.sender_id] }),
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
        const identity = payload.byId?.[message.sender_id];
        if (identity) {
          setSender({
            id: identity.user_id,
            full_name: identity.full_name,
            email: identity.email,
            avatar_url: identity.avatar_url,
          });
        }
      } catch {
        // best-effort; fall back to sender_id
      }
    };

    resolveIdentity();
    return () => {
      canceled = true;
    };
  }, [
    message.sender_id,
    sender?.avatar_url,
    sender?.email,
    sender?.full_name,
    sender?.id,
  ]);

  const time = formatDistanceToNow(new Date(message.created_at), {
    addSuffix: true,
  });
  const absoluteTime = new Date(message.created_at).toLocaleString();
  const senderName =
    sender?.full_name?.trim() ||
    sender?.email?.trim() ||
    message.sender_id ||
    "Usuário";

  return (
    <div
      className={cn(
        "flex w-full gap-3",
        isOwn ? "justify-end" : "justify-start"
      )}>
      <div
        className={cn(
          "flex items-start gap-3",
          isOwn ? "flex-row-reverse" : "flex-row"
        )}>
        <Avatar className="h-10 w-10 shrink-0 shadow-md border-2 border-white">
          <AvatarImage src={sender?.avatar_url ?? undefined} alt={senderName} />
          <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
        </Avatar>

        <div
          className={cn(
            "flex max-w-[75%] flex-col gap-1",
            isOwn ? "items-end text-right" : "items-start"
          )}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">{senderName}</span>
          </div>

          <div
            className={cn(
              "w-fit rounded-2xl px-4 py-4 text-sm shadow-sm",
              isOwn
                ? "bg-primary text-primary-foreground leading-5"
                : "bg-gray-200 text-primary leading-5"
            )}
            dangerouslySetInnerHTML={{ __html: message.message }}
          />
          <span className="text-xs px-2">
            <span className="mx-1 text-gray-400">{absoluteTime} -</span>
            <span className="text-muted-foreground">{time}</span>
          </span>

          {Array.isArray(message.attachments) &&
          message.attachments.length > 0 ? (
            <div className="mt-1 flex w-full max-w-[320px] flex-col gap-2">
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
      </div>
    </div>
  );
}

function getInitials(value: string) {
  if (!value) return "U";
  const trimmed = value.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : "U";
}
