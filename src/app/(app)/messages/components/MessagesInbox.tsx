"use client";

import { useState } from "react";
import { ChatFiltersPanel, type ChatFilters } from "./ChatFiltersPanel";
import { NewMessageModal } from "./NewMessageModal";
import { ChatList } from "./ChatList";

const DEFAULT_FILTERS: ChatFilters = {};

export function MessagesInbox({
  canCreateConversation,
}: {
  canCreateConversation: boolean;
}) {
  const [filters, setFilters] = useState<ChatFilters>(DEFAULT_FILTERS);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2>Conversas</h2>
        <div className="flex items-center gap-2">
          <ChatFiltersPanel value={filters} onApply={setFilters} />
          {canCreateConversation ? (
            <NewMessageModal canCreateConversation={canCreateConversation} />
          ) : null}
        </div>
      </div>

      <ChatList filters={filters} />
    </div>
  );
}
