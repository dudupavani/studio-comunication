"use client";

import { X } from "lucide-react";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { Button } from "@/components/ui/button";
import { CHAT_PANEL_TABS, type ChatPanelTab } from "./ChatPanelTabs";

export interface ChatHeaderProps {
  chat: Chat;
  members: ChatMemberWithUser[];
  onOpenPanel?: (tab: ChatPanelTab) => void;
  onCloseChat?: () => void;
}

export function ChatHeader({
  chat,
  onOpenPanel,
  onCloseChat,
}: ChatHeaderProps) {
  return (
    <div className="border-b border-border">
      <div className="flex items-center justify-between px-3 sm:px-5 py-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">
            {chat.name ?? "Conversa"}
          </p>
        </div>
        {onCloseChat ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Fechar conversa"
              className="flex sm:hidden"
              onClick={() => onCloseChat?.()}>
              <X />
            </Button>
          </div>
        ) : null}
      </div>
      {onOpenPanel ? (
        <div className="sm:hidden border-t border-border overflow-x-auto">
          <div className="flex min-w-max gap-2 px-3 py-2" role="tablist">
            {CHAT_PANEL_TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.key}
                  type="button"
                  size="xs"
                  variant="ghost"
                  onClick={() => onOpenPanel?.(tab.key)}
                  className="whitespace-nowrap"
                  aria-label={tab.label}>
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
