"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Chat } from "@/lib/messages/types";
import type { ChatMemberWithUser } from "./types";
import { ConversationLayout } from "./ConversationLayout";

type Props = {
  chat: Chat;
  chatId: string;
  currentUserId: string;
  initialMembers: ChatMemberWithUser[];
  canManageMembers: boolean;
};

export function ChatFullscreenModal({
  chat,
  chatId,
  currentUserId,
  initialMembers,
  canManageMembers,
}: Props) {
  const router = useRouter();

  const close = useCallback(() => {
    router.push("/chats");
  }, [router]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close]);

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col bg-white">
      <div className="flex-1 overflow-hidden">
        <ConversationLayout
          chat={chat}
          chatId={chatId}
          currentUserId={currentUserId}
          initialMembers={initialMembers}
          canManageMembers={canManageMembers}
          onClose={close}
        />
      </div>
    </div>
  );
}
