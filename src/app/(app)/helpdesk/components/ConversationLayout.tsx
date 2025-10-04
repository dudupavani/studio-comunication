"use client";

import { useState } from "react";
import type { Chat } from "@/lib/helpdesk/types";
import type { ChatMemberWithUser } from "./types";
import { ChatSidebarList } from "./ChatSidebarList";
import { ChatWindow } from "./ChatWindow";
import { ChatDetails } from "./ChatDetails";

interface ConversationLayoutProps {
  chat: Chat;
  chatId: string;
  currentUserId: string;
  initialMembers: ChatMemberWithUser[];
  canManageMembers: boolean;
}

export function ConversationLayout({
  chat,
  chatId,
  currentUserId,
  initialMembers,
  canManageMembers,
}: ConversationLayoutProps) {
  const [members, setMembers] = useState<ChatMemberWithUser[]>(initialMembers);

  return (
    <div className="flex flex-col lg:flex-row h-dvh">
      <aside className="h-full hidden w-full max-w-xs lg:block border-r">
        <ChatSidebarList activeChatId={chatId} />
      </aside>

      <div className="h-full flex min-h-0 flex-1 flex-col">
        <ChatWindow
          chat={chat}
          chatId={chatId}
          currentUserId={currentUserId}
          members={members}
        />
      </div>

      <aside className="hidden w-full max-w-xs border-l border-border bg-background xl:block">
        <ChatDetails
          chat={chat}
          chatId={chatId}
          members={members}
          canManageMembers={canManageMembers}
          onMembersChange={setMembers}
        />
      </aside>
    </div>
  );
}
