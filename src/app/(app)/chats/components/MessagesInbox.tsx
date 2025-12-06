"use client";

import { useState } from "react";
import type { ChatFilters } from "@/lib/messages/types";
import { ChatFiltersPanel } from "./ChatFiltersPanel";
import { NewMessageModal } from "./NewMessageModal";
import { ChatList } from "./ChatList";
import { useNotificationBadges } from "@/hooks/use-notification-badges";
import { useAuthContext } from "@/hooks/use-auth-context";

const DEFAULT_FILTERS: ChatFilters = {
  creatorIds: [],
  createdFrom: null,
  createdTo: null,
};

export function MessagesInbox({
  canCreateConversation,
}: {
  canCreateConversation: boolean;
}) {
  const [filters, setFilters] = useState<ChatFilters>(DEFAULT_FILTERS);
  const { auth } = useAuthContext();
  const { chatMap, markChatAsRead } = useNotificationBadges({
    enabled: !!auth,
    userId: auth?.userId ?? null,
  });

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex w-full justify-end items-center gap-2">
          <ChatFiltersPanel value={filters} onApply={setFilters} />
          {canCreateConversation ? (
            <NewMessageModal canCreateConversation={canCreateConversation} />
          ) : null}
        </div>
      </div>

      <ChatList
        filters={filters}
        unreadMap={chatMap}
        onChatViewed={markChatAsRead}
      />
    </div>
  );
}
