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
  ChevronUp,
  ChevronDown,
  Layers2,
  Type as IconText,
  Square as IconRect,
  Circle as IconCircle,
  Triangle as IconTriangle,
  Minus as IconLine,
  Star as IconStar,
  Image as IconImage,
} from "lucide-react";
import clsx from "clsx";
import type { Selection } from "@/components/design-editor/types/selection";

/** Item de camada vindo do Canvas */
type Item = {
  id: string;
  type: string;
  kind: "shape" | "image";
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
  /** ordem de empilhamento (maior = mais no topo) */
  z?: number;
  /** nome lógico da layer (p.ex. "ImagesLayer" | "ShapesLayer") — não usado aqui, mas preservado */
  layer?: string;
};

/** Mensagem de estado vinda do Canvas */
type EditorStateMsg = {
  items: Item[];
  selection: Selection;
};

type Props = {
  className?: string;
};

export default function LayersPanel({ className }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const onState = (ev: Event) => {
      const e = ev as CustomEvent<EditorStateMsg>;
      const detail = e.detail;
      if (!detail) return;

      if (Array.isArray(detail.items)) setItems(detail.items);

      const { selection } = detail;
      if (!selection) return;

      if (selection.kind === "none") {
        setSelectedIds([]);
      } else if (selection.kind === "mixed") {
        setSelectedIds([
          ...selection.shapeIds,
          ...(selection.textIds ?? []),
          ...selection.imageIds,
        ]);
      } else {
        setSelectedIds(selection.ids);
      }
    };

    window.addEventListener("design-editor:state", onState as EventListener);
    return () =>
      window.removeEventListener(
        "design-editor:state",
        onState as EventListener
      );
  }, []);

  // === Event-bus helpers ===
  const dispatch = (name: string, detail: Record<string, any>) =>
    window.dispatchEvent(new CustomEvent(`design-editor:${name}`, { detail }));

  const selectItem = (id: string) => dispatch("select", { id });
  const toggleHidden = (id: string) => dispatch("toggle-hidden", { id });
  const toggleLocked = (id: string) => dispatch("toggle-locked", { id });
  const bringForward = (id: string) => dispatch("bring-forward", { id });
  const sendBackward = (id: string) => dispatch("send-backward", { id });
  const remove = (id: string) => dispatch("delete", { id });

  // Ícone por tipo (shapes) e imagem
  const typeIcon = useMemo(
    () => ({
      text: IconText,
      rect: IconRect,
      circle: IconCircle,
      triangle: IconTriangle,
      line: IconLine,
      star: IconStar,
      image: IconImage,
    }),
    []
  );

  const isSelected = (id: string) => selectedIds.includes(id);

  // ✅ Ordena visualmente do topo → base (z desc; undefined vira 0)
  const orderedItems = useMemo(() => {
    return [...items].sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
  }, [items]);

  return (
    <aside className={clsx("flex h-full w-full flex-col gap-2 p-2", className)}>
      <header className="mb-1 flex items-center justify-between px-1">
        <h3 className="text-lg font-semibold">Camadas</h3>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        <ul className="flex flex-col gap-1">
          {orderedItems.length === 0 && (
            <div className="flex flex-col items-center gap-4 px-2 py-4 text-center text-xs text-muted-foreground">
              <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-md">
                <Layers2 size={18} />
              </div>
              <span className="text-gray-500">
                Adicione elementos na área de trabalho
              </span>
            </div>
          )}

          {orderedItems.map((it) => {
            const isImage = it.kind === "image";
            const iconKey = it.type as keyof typeof typeIcon;
            const Icon = typeIcon[iconKey] || IconRect;
            const selected = isSelected(it.id);

            // Controles granulares
            const canReorder = true; // reordenar habilitado p/ todos
            const canRemove = true; // remover habilitado p/ todos
            const canHide = !isImage; // manter ocultar só p/ shapes/text
            const canLock = !isImage; // manter bloquear só p/ shapes/text

            return (
              <li
                key={it.id}
                className={clsx(
                  "group flex items-center justify-start gap-2 rounded-md border px-1.5 py-1",
                  selected
                    ? "border-primary/40 bg-gray-200"
                    : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                )}>
                {/* Z-order */}
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={
                      canReorder
                        ? "Trazer para frente"
                        : "Reordenar indisponível"
                    }
                    disabled={!canReorder}
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
                    title={
                      canReorder ? "Enviar para trás" : "Reordenar indisponível"
                    }
                    disabled={!canReorder}
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
                  variant="ghost"
                  onClick={() => selectItem(it.id)}
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
                    {it.name || (isImage ? "Imagem" : it.id)}
                  </span>
                </Button>

                {/* Ações */}
                <div className="flex shrink-0 items-center">
                  {/* Ocultar/Mostrar */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={
                      canHide
                        ? it.isHidden
                          ? "Mostrar"
                          : "Ocultar"
                        : "Ocultar/mostrar indisponível"
                    }
                    disabled={!canHide}
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

                  {/* Bloquear/Desbloquear */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={
                      canLock
                        ? it.isLocked
                          ? "Desbloquear"
                          : "Bloquear"
                        : "Bloquear/desbloquear indisponível"
                    }
                    disabled={!canLock}
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

                  {/* Remover */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:text-red-600"
                    title={canRemove ? "Remover" : "Remoção indisponível"}
                    disabled={!canRemove}
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
