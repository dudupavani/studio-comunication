"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
  type ReactNode,
  Children,
  isValidElement,
  cloneElement,
} from "react";
import { cn } from "@/lib/utils";
import type { ChatMessageWithSender } from "@/hooks/use-messages";
import type { ChatMessageMention, UserMini } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Paperclip } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MessageItemProps {
  message: ChatMessageWithSender;
  isOwn: boolean;
  currentUserId: string;
  members: ChatMemberWithUser[];
}

export function MessageItem({
  message,
  isOwn,
  currentUserId,
  members,
}: MessageItemProps) {
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

  const absoluteTime = new Date(message.created_at).toLocaleString();
  const senderName =
    sender?.full_name?.trim() ||
    sender?.email?.trim() ||
    message.sender_id ||
    "Usuário";
  const effectiveMentions =
    message.mentions && message.mentions.length > 0
      ? message.mentions
      : deriveMentionsFromText(message.message, members);

  const hasMentionHighlight = effectiveMentions.some(
    (mention) =>
      mention.type === "all" || mention.mentioned_user_id === currentUserId
  );
  const renderedContent = renderMessageWithMentions(
    message.message,
    effectiveMentions,
    currentUserId
  );

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
        <Avatar className="h-10 w-10 shrink-0 shadow-md border-1 border-white">
          <AvatarImage src={sender?.avatar_url ?? undefined} alt={senderName} />
          <AvatarFallback>{getInitials(senderName)}</AvatarFallback>
        </Avatar>

        <div
          className={cn(
            "flex max-w-[75%] flex-col gap-1",
            isOwn ? "items-end text-left" : "items-start"
          )}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">{senderName}</span>
          </div>

          <div
            className={cn(
              "w-fit rounded-2xl px-4 py-4 text-sm leading-5",
              isOwn
                ? "bg-white border text-primary"
                : "bg-gray-200 text-primary",
              hasMentionHighlight ? "bg-amber-50 ring-1 ring-amber-200" : ""
            )}>
            {renderedContent}
            <span className="mt-2 block text-right text-xs text-gray-500">
              {absoluteTime}
            </span>
          </div>

          {Array.isArray(message.attachments) &&
          message.attachments.length > 0 ? (
            <div className="mt-1 flex flex-col gap-2">
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
                      "flex items-center gap-2 rounded-lg border px-3 py-3 text-xs transition bg-white shadow-sm hover:shadow-md",
                      isOwn
                        ? "border-border hover:border-gray-400"
                        : "border-border"
                    )}>
                    {isImage && att.url ? (
                      <div className="relative min-h-20 min-w-20 overflow-hidden rounded-md bg-muted">
                        <Image
                          src={att.url}
                          alt={att.name || "Anexo"}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    <div className="flex flex-col overflow-hidden">
                      <div className="line-clamp-2 font-medium text-foreground">
                        {att.name || "Anexo"}
                      </div>
                      {att.size ? (
                        <div className="text-[11px] text-muted-foreground">
                          {(att.size / 1024).toFixed(1)} KB
                        </div>
                      ) : null}
                      <span className="mt-2 block text-right text-xs text-gray-500">
                        {absoluteTime}
                      </span>
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

function renderMessageWithMentions(
  text: string,
  mentions: ChatMessageMention[],
  currentUserId: string
) {
  if (!text) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">
            {renderNodesWithMentions(children, mentions, currentUserId)}
          </p>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 last:mb-0 list-disc space-y-1 pl-5">
            {renderNodesWithMentions(children, mentions, currentUserId)}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 last:mb-0 list-decimal space-y-1 pl-5">
            {renderNodesWithMentions(children, mentions, currentUserId)}
          </ol>
        ),
        li: ({ children }) => (
          <li className="leading-relaxed">
            {renderNodesWithMentions(children, mentions, currentUserId)}
          </li>
        ),
        strong: ({ children }) => (
          <strong>
            {renderNodesWithMentions(children, mentions, currentUserId)}
          </strong>
        ),
        em: ({ children }) => (
          <em>{renderNodesWithMentions(children, mentions, currentUserId)}</em>
        ),
      }}>
      {text}
    </ReactMarkdown>
  );
}

function renderNodesWithMentions(
  children: ReactNode,
  mentions: ChatMessageMention[],
  currentUserId: string
): ReactNode {
  return Children.toArray(children).flatMap((child, idx) => {
    if (typeof child === "string") {
      return splitTextByMentions(child, mentions, currentUserId, `txt-${idx}`);
    }

    if (isValidElement(child)) {
      const inner =
        child.props?.children !== undefined
          ? renderNodesWithMentions(
              child.props.children,
              mentions,
              currentUserId
            )
          : child.props?.value && typeof child.props.value === "string"
          ? splitTextByMentions(
              child.props.value,
              mentions,
              currentUserId,
              `txt-${idx}-val`
            )
          : child.props?.children;

      return cloneElement(child, { key: child.key ?? idx }, inner);
    }

    return child;
  });
}

function splitTextByMentions(
  text: string,
  mentions: ChatMessageMention[],
  currentUserId: string,
  keyPrefix: string
) {
  if (!text) return [text];

  const nodes: ReactNode[] = [];
  const sorted = [...mentions].sort((a, b) => a.id - b.id);
  let cursor = 0;

  sorted.forEach((mention, idx) => {
    const searchLabel =
      mention.raw_label?.trim() || buildMentionLabel(mention).trim();
    if (!searchLabel) return;
    const slice = text.slice(cursor);
    const match = new RegExp(`@${escapeRegExp(searchLabel)}`, "i").exec(slice);
    if (!match) return;

    const start = cursor + match.index;
    const end = start + match[0].length;

    if (start > cursor) {
      nodes.push(text.slice(cursor, start));
    }

    nodes.push(
      <MentionPill
        key={`${keyPrefix}-mention-${mention.id}-${idx}-${start}`}
        mention={mention}
        isCurrentUser={
          mention.type === "all"
            ? false
            : mention.mentioned_user_id === currentUserId
        }
      />
    );

    cursor = end;
  });

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
}

function deriveMentionsFromText(
  text: string,
  members: ChatMemberWithUser[]
): ChatMessageMention[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const derived: ChatMessageMention[] = [];

  if (lower.includes("@todos")) {
    derived.push({
      id: Number.MIN_SAFE_INTEGER,
      type: "all",
      mentioned_user_id: null,
      raw_label: "Todos",
    });
  }

  members.forEach((member, index) => {
    const label =
      member.user?.full_name?.trim() ||
      member.user?.email?.trim() ||
      member.user_id;
    if (!label) return;
    const normalized = label.toLowerCase();
    if (lower.includes(`@${normalized}`)) {
      derived.push({
        id: Number.MIN_SAFE_INTEGER + index + 1,
        type: "user",
        mentioned_user_id: member.user_id,
        raw_label: label,
        user: member.user,
      });
    }
  });

  return derived;
}

function MentionPill({
  mention,
  isCurrentUser,
}: {
  mention: ChatMessageMention;
  isCurrentUser?: boolean;
}) {
  const isAllMention = mention.type === "all";
  const baseLabel =
    mention.type === "all" ? "Todos" : buildMentionLabel(mention);

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold text-sm whitespace-nowrap",
        isAllMention ? "text-amber-900" : "rounded-full bg-gray-50 px-2 py-1",
        isCurrentUser ? "ring-1 ring-primary/40" : ""
      )}>
      <span className="font-semibold">@</span>
      <span className="ml-0.5">{baseLabel}</span>
    </span>
  );
}

function buildMentionLabel(mention: ChatMessageMention) {
  if (mention.type === "all") return "Todos";
  return (
    mention.user?.full_name?.trim() ||
    mention.user?.email?.trim() ||
    mention.raw_label?.trim() ||
    "Usuário"
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
