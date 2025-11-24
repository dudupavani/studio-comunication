"use client";

import { MoreHorizontal } from "lucide-react";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { Button } from "@/components/ui/button";

export interface ChatHeaderProps {
  chat: Chat;
  members: ChatMemberWithUser[];
}

function resolveSubtitle(members: ChatMemberWithUser[], chat: Chat) {
  if (chat.type === "direct") {
    const other = members.find((m) => m.role !== "admin");
    if (other?.user?.full_name) return other.user.full_name;
    if (other?.user?.email) return other.user.email;
  }
  const names = members
    .map((m) => m.user?.full_name || m.user?.email)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  return names || `${members.length} participante(s)`;
}

export function ChatHeader({ chat, members }: ChatHeaderProps) {
  const subtitle = resolveSubtitle(members, chat);

  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          {chat.name ?? "Conversa"}
        </h1>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-5 w-5" />
      </Button>
    </div>
  );
}
