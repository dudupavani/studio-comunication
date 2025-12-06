"use client";

import { useEffect, useState } from "react";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { ChatSidebarList } from "./ChatSidebarList";
import { ChatWindow } from "./ChatWindow";
import { ChatDetails } from "./ChatDetails";
import { ChatPanelTabs, type ChatPanelTab } from "./ChatPanelTabs";
import { ChatAttachmentsPanel } from "./ChatAttachmentsPanel";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface ConversationLayoutProps {
  chat: Chat;
  chatId: string;
  currentUserId: string;
  initialMembers: ChatMemberWithUser[];
  canManageMembers: boolean;
  onClose?: () => void;
}

export function ConversationLayout({
  chat,
  chatId,
  currentUserId,
  initialMembers,
  canManageMembers,
  onClose,
}: ConversationLayoutProps) {
  const [members, setMembers] = useState<ChatMemberWithUser[]>(initialMembers);
  const [activePanel, setActivePanel] = useState<ChatPanelTab>("details");
  const [attachmentsVersion, setAttachmentsVersion] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<ChatPanelTab | null>(null);

  useEffect(() => {
    let cancelled = false;
    const markAsRead = async () => {
      try {
        const res = await fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scope: "chat", chatId }),
        });
        if (!res.ok) {
          throw new Error(`Mark chat notification failed (${res.status})`);
        }
        if (!cancelled && typeof window !== "undefined") {
          window.dispatchEvent(new Event("notifications:refresh"));
        }
      } catch (err) {
        console.warn("CHAT mark notifications error", err);
      }
    };
    markAsRead();
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  const renderPanel = (panel: ChatPanelTab) => {
    switch (panel) {
      case "attachments":
        return (
          <ChatAttachmentsPanel
            chatId={chatId}
            refreshToken={attachmentsVersion}
          />
        );
      case "notes":
        return (
          <div className="flex h-full flex-col gap-3 px-5 py-4">
            <h3 className="font-semibold">Notas</h3>
            <p className="text-xs text-muted-foreground">
              Espaço para notas internas (em breve).
            </p>
          </div>
        );
      case "details":
      default:
        return (
          <ChatDetails
            chat={chat}
            chatId={chatId}
            members={members}
            canManageMembers={canManageMembers}
            onMembersChange={setMembers}
          />
        );
    }
  };

  const handleOpenPanel = (tab: ChatPanelTab) => {
    setActivePanel(tab);
    setMobilePanel(tab);
  };

  const handleCloseMobilePanel = () => {
    setMobilePanel(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen">
      <aside className="h-full hidden w-full max-w-xs lg:block border-r">
        <ChatSidebarList activeChatId={chatId} />
      </aside>

      <div className="h-full flex min-h-0 flex-1 flex-col">
        <ChatWindow
          chat={chat}
          chatId={chatId}
          currentUserId={currentUserId}
          members={members}
          onAttachmentsAdded={() => setAttachmentsVersion((v) => v + 1)}
          onOpenPanel={handleOpenPanel}
          onCloseChat={onClose}
        />
      </div>

      <aside className="hidden w-full max-w-sm border-l border-border bg-background xl:flex">
        <div className="flex-1 min-w-[200px]">{renderPanel(activePanel)}</div>
        <ChatPanelTabs
          active={activePanel}
          onChange={setActivePanel}
          onClose={onClose}
        />
      </aside>

      {mobilePanel ? (
        <Sheet
          open
          onOpenChange={(open) => {
            if (!open) handleCloseMobilePanel();
          }}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-sm px-0 xl:hidden">
            <div className="h-full overflow-y-auto">
              {renderPanel(mobilePanel)}
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </div>
  );
}
