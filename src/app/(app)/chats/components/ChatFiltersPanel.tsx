"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type ChatFilters = Record<string, never>;

interface ChatFiltersPanelProps {
  value: ChatFilters;
  onApply: (filters: ChatFilters) => void;
}

export function ChatFiltersPanel({ value, onApply }: ChatFiltersPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ChatFilters>(value);
  // Placeholder até termos filtros reais

  useEffect(() => {
    if (!open) {
      setDraft(value);
      // futuros filtros resetados aqui também
    }
  }, [open, value]);

  const handleApply = (close: () => void) => {
    onApply(draft);
    close();
  };

  return (
    <SidePanel
      width={360}
      onOpenChange={setOpen}
      renderTrigger={({ setOpen }) => (
        <Button variant="outline" className="gap-2" onClick={() => setOpen(true)}>
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      )}
    >
      {(close) => (
        <div className="flex h-full flex-col">
          <div className="flex-1 space-y-6 px-6 py-6 overflow-y-auto">
            <div>
              <h2 className="text-lg font-semibold">Filtrar conversas</h2>
              <p className="text-xs text-muted-foreground">
                Ajuste os filtros para localizar conversas específicas.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Filtros disponíveis em breve</Label>
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Assim que as novas opções estiverem disponíveis, você poderá
                filtrar conversas por status, participantes ou período.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border px-6 py-4">
            <Button
              variant="secondary"
              onClick={() => {
                setDraft({});
              }}
              className="flex-1"
            >
              Limpar filtros
            </Button>
            <Button onClick={() => handleApply(close)} className="flex-1">
              Aplicar filtros
            </Button>
          </div>
        </div>
      )}
    </SidePanel>
  );
}
