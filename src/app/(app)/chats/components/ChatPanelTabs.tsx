"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Users, Paperclip, StickyNote, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ChatPanelTab = "details" | "attachments" | "notes";

type TabDef = {
  key: ChatPanelTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

const TABS: TabDef[] = [
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
    <div className="flex w-14 flex-col items-center gap-3 border-l border-border bg-muted/30 py-4">
      {onClose ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar painel"
          className="text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </Button>
      ) : null}
      {TABS.map((tab) => {
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
  );
}
