"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { SidePanel } from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export type ChatFilters = {
  type?: "direct" | "group" | "broadcast";
};

interface ChatFiltersPanelProps {
  value: ChatFilters;
  onApply: (filters: ChatFilters) => void;
}

export function ChatFiltersPanel({ value, onApply }: ChatFiltersPanelProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ChatFilters>(value);
  // TODO: incluir demais filtros quando backend suportar

  useEffect(() => {
    if (!open) {
      setDraft(value);
      // futuros filtros resetados aqui também
    }
  }, [open, value]);

  const typeOptions = useMemo(
    () => [
      { label: "Direta", value: "direct" },
      { label: "Grupo", value: "group" },
    ],
    []
  );

  const toggleType = (value: "direct" | "group" | "broadcast") => {
    setDraft((prev) => ({ type: prev.type === value ? undefined : value }));
  };

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
              <Label>Tipo</Label>
              <div className="space-y-2">
                {typeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-muted"
                  >
                    <Checkbox
                      checked={draft.type === option.value}
                      onCheckedChange={() => toggleType(option.value)}
                    />
                    <span className="text-sm text-foreground">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              Outros filtros (busca, não lidas, respostas) serão adicionados em breve.
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
