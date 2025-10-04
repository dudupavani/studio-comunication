"use client";

import { useState } from "react";
import { ChatFiltersPanel, type ChatFilters } from "./ChatFiltersPanel";
import { NewMessageModal } from "./NewMessageModal";
import { ChatList } from "./ChatList";

const DEFAULT_FILTERS: ChatFilters = {};

export function HelpdeskInbox() {
  const [filters, setFilters] = useState<ChatFilters>(DEFAULT_FILTERS);

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Helpdesk</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie suas conversas com clientes e membros da equipe.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChatFiltersPanel value={filters} onApply={setFilters} />
          <NewMessageModal />
        </div>
      </div>

      <ChatList filters={filters} />
    </div>
  );
}
