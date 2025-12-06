"use client";

import { MoreHorizontal, X } from "lucide-react";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CHAT_PANEL_TABS, type ChatPanelTab } from "./ChatPanelTabs";

export interface ChatHeaderProps {
  chat: Chat;
  members: ChatMemberWithUser[];
  onOpenPanel?: (tab: ChatPanelTab) => void;
  onCloseChat?: () => void;
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

export function ChatHeader({
  chat,
  members,
  onOpenPanel,
  onCloseChat,
}: ChatHeaderProps) {
  const subtitle = resolveSubtitle(members, chat);

  return (
    <div className="flex items-center justify-between border-b border-border px-5 py-3">
      <div>
        <h6 className="font-semibold">{chat.name ?? "Conversa"}</h6>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {onOpenPanel || onCloseChat ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir ações do chat"
              className="xl:hidden">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onOpenPanel
              ? CHAT_PANEL_TABS.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <DropdownMenuItem
                      key={tab.key}
                      onSelect={(event) => {
                        event.preventDefault();
                        onOpenPanel?.(tab.key);
                      }}>
                      <Icon className="mr-2 h-4 w-4" />
                      {tab.label}
                    </DropdownMenuItem>
                  );
                })
              : null}
            {onCloseChat ? (
              <>
                {onOpenPanel ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(event) => {
                    event.preventDefault();
                    onCloseChat?.();
                  }}>
                  <X className="mr-2 h-4 w-4" />
                  Fechar conversa
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
