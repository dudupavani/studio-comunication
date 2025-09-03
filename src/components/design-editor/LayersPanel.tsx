// src/components/design-editor/LayersPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ArrowUp,
  ArrowDown,
  Type as IconText,
  Square as IconRect,
  Circle as IconCircle,
  Triangle as IconTriangle,
  Minus as IconLine,
  Star as IconStar,
  ChevronUp,
  ChevronDown,
  Layers2,
} from "lucide-react";
import clsx from "clsx";

/** Mensagem emitida pelo Canvas via `design-editor:state` */
type EditorStateMsg = {
  selectedId: string | null;
  shapes: Array<{
    id: string;
    type: "rect" | "text" | "circle" | "triangle" | "line" | "star";
    name?: string;
    isHidden?: boolean;
    isLocked?: boolean;
  }>;
};

type LayerItem = EditorStateMsg["shapes"][number];

type Props = {
  className?: string;
};

/**
 * Painel de Camadas
 * - Escuta `design-editor:state` para refletir a lista/seleção atuais.
 * - Dispara ações via event-bus: select / toggle-hidden / toggle-locked / z-order / delete.
 */
export default function LayersPanel({ className }: Props) {
  const [items, setItems] = useState<LayerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const onState = (ev: Event) => {
      const e = ev as CustomEvent<EditorStateMsg>;
      const detail = e.detail;
      if (!detail) return;
      setSelectedId(detail.selectedId ?? null);
      setItems(detail.shapes ?? []);
    };
    window.addEventListener("design-editor:state", onState as EventListener);
    return () =>
      window.removeEventListener(
        "design-editor:state",
        onState as EventListener
      );
  }, []);

  // Ações (event-bus)
  const select = (id: string) =>
    window.dispatchEvent(
      new CustomEvent("design-editor:select", { detail: { id } })
    );

  const toggleHidden = (id: string) =>
    window.dispatchEvent(
      new CustomEvent("design-editor:toggle-hidden", { detail: { id } })
    );

  const toggleLocked = (id: string) =>
    window.dispatchEvent(
      new CustomEvent("design-editor:toggle-locked", { detail: { id } })
    );

  const bringForward = (id: string) =>
    window.dispatchEvent(
      new CustomEvent("design-editor:bring-forward", { detail: { id } })
    );

  const sendBackward = (id: string) =>
    window.dispatchEvent(
      new CustomEvent("design-editor:send-backward", { detail: { id } })
    );

  const remove = (id: string) =>
    window.dispatchEvent(
      new CustomEvent("design-editor:delete", { detail: { id } })
    );

  // Ícone por tipo
  const typeIcon = useMemo(
    () => ({
      text: IconText,
      rect: IconRect,
      circle: IconCircle,
      triangle: IconTriangle,
      line: IconLine,
      star: IconStar,
    }),
    []
  );

  return (
    <aside className={clsx("flex h-full w-full flex-col gap-2 p-2", className)}>
      <header className="mb-1 flex items-center justify-between px-1">
        <h3 className="text-lg font-semibold">Camadas</h3>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <ul className="flex flex-col gap-1">
          {items.length === 0 && (
            <div className="flex flex-col items-center gap-4 px-2 py-4 text-center text-xs text-muted-foreground">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-md">
                <Layers2 size={18} />
              </div>
              <span className="text-gray-500">
                Adicione elementos na área de trabalho
              </span>
            </div>
          )}

          {items.map((it) => {
            const Icon = typeIcon[it.type as keyof typeof typeIcon] || IconRect;
            const isSelected = it.id === selectedId;

            return (
              <li
                key={it.id}
                className={clsx(
                  "group flex items-center justify-start gap-2 rounded-md border px-1.5 py-1",
                  isSelected
                    ? "border-primary/40 bg-gray-200"
                    : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                )}>
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Trazer para frente"
                    onClick={(e) => {
                      e.stopPropagation();
                      bringForward(it.id);
                    }}>
                    <ChevronUp size={16} className="text-gray-500" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title="Enviar para trás"
                    onClick={(e) => {
                      e.stopPropagation();
                      sendBackward(it.id);
                    }}>
                    <ChevronDown size={16} className="text-gray-500" />
                  </Button>
                </div>

                {/* Área clicável para seleção */}
                <Button
                  type="button"
                  variant={"ghost"}
                  onClick={() => select(it.id)}
                  className="flex min-w-0 w-full !px-0 justify-start items-center gap-2 text-left hover:bg-transparent"
                  title={it.name || it.id}>
                  <Icon
                    size={16}
                    className={clsx(
                      "shrink-0",
                      it.isHidden ? "opacity-40" : "opacity-90"
                    )}
                  />
                  <span
                    className={clsx(
                      "truncate text-sm font-medium",
                      it.isHidden ? "text-muted-foreground" : "text-foreground"
                    )}>
                    {it.name || it.id}
                  </span>
                </Button>

                {/* Ações */}
                <div className="flex shrink-0 items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={it.isHidden ? "Mostrar" : "Ocultar"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHidden(it.id);
                    }}>
                    {it.isHidden ? (
                      <Eye size={14} className="opacity-80" />
                    ) : (
                      <EyeOff size={14} className="opacity-80" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={it.isLocked ? "Desbloquear" : "Bloquear"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLocked(it.id);
                    }}>
                    {it.isLocked ? (
                      <Unlock size={14} className="opacity-80" />
                    ) : (
                      <Lock size={14} className="opacity-80" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-red-600"
                    title="Remover"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(it.id);
                    }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
