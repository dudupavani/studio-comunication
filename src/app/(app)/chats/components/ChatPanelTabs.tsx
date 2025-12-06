"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Users, Paperclip, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ChatPanelTab = "details" | "attachments" | "notes";

export type TabDef = {
  key: ChatPanelTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

export const CHAT_PANEL_TABS: TabDef[] = [
  { key: "details", icon: Users, label: "Participantes" },
  { key: "attachments", icon: Paperclip, label: "Anexos" },
  { key: "notes", icon: StickyNote, label: "Notas" },
];

interface Props {
  active: ChatPanelTab;
  onChange: (tab: ChatPanelTab) => void;
  onClose?: () => void;
}

export function ChatPanelTabs({ active, onChange, onClose }: Props) {
  return (
    <div className="flex w-14 flex-col items-center border-l border-border bg-muted/30">
      {onClose ? (
        <Button
          variant="ghost"
          size="icon-md"
          onClick={onClose}
          aria-label="Fechar painel"
          className="border-b border-border rounded-none w-14 h-14 hover:bg-gray-200">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      <div className="flex flex-col py-4 gap-3">
        {CHAT_PANEL_TABS.map((tab) => {
          const Icon = tab.icon;
          const selected = active === tab.key;
          return (
            <Button
              key={tab.key}
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onChange(tab.key)}
              className={cn(
                "text-muted-foreground",
                selected &&
                  "bg-gray-300 border border-gray-600 text-primary shadow-md"
              )}
              aria-label={tab.label}
              title={tab.label}>
              <Icon className="h-5 w-5" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}
