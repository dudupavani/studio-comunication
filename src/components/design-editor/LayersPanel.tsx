// src/components/design-editor/LayersPanel.tsx
"use client";

import { useMemo } from "react";
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
import { useSelectionContext } from "@/components/design-editor/SelectionContext";
import { useEditorState } from "@/components/design-editor/EditorStateContext";

/** Item de camada renderizado */
type Item = {
  id: string;
  type: string;
  kind: "shape" | "image";
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
  z: number; // ordem empilhamento (0 = base)
};

type Props = {
  className?: string;
};

export default function LayersPanel({ className }: Props) {
  const { selection, actions: sel } = useSelectionContext();
  const {
    shapes,
    images,
    stack,
    updateShape,
    removeShape,
    removeImage,
    bringForward,
    sendBackward,
  } = useEditorState();

  // itens ordenados do topo → base (z desc)
  const orderedItems: Item[] = useMemo(() => {
    const filenameFromPath = (p?: string) => {
      if (!p) return "Imagem";
      const base = p.split("/").pop() || "Imagem";
      return base || "Imagem";
    };

    // z = index do stack (base -> topo). Para ordenar topo->base, vamos usar desc na renderização.
    const built = stack.map((k, idx) => {
      if (k.kind === "image") {
        const img = images.find((i) => i.id === k.id);
        return {
          id: k.id,
          kind: "image" as const,
          type: "image",
          name: filenameFromPath(img?.path),
          isHidden: false,
          isLocked: false,
          z: idx,
        };
      }
      const s = shapes.find((x) => x.id === k.id);
      return {
        id: k.id,
        kind: "shape" as const,
        type: s?.type ?? "rect",
        name: s?.name,
        isHidden: !!s?.isHidden,
        isLocked: !!s?.isLocked,
        z: idx,
      };
    });

    return [...built].sort((a, b) => (b.z ?? 0) - (a.z ?? 0));
  }, [stack, shapes, images]);

  // ids selecionados para destacar na lista
  const selectedIds = useMemo<string[]>(() => {
    if (!selection || selection.kind === "none") return [];
    if (selection.kind === "image") return selection.ids;
    if (selection.kind === "shape" || selection.kind === "text")
      return selection.ids;
    if (selection.kind === "mixed")
      return [
        ...selection.imageIds,
        ...selection.shapeIds,
        ...(selection.textIds ?? []),
      ];
    return [];
  }, [selection]);

  // === Ações ===
  const selectItem = (id: string) => {
    const isShape = shapes.some((s) => s.id === id);
    const isImage = images.some((i) => i.id === id);
    if (isShape) sel.select("shape", id);
    else if (isImage) sel.select("image", id);
  };
  const toggleHidden = (id: string) => {
    const s = shapes.find((sh) => sh.id === id);
    if (!s) return;
    updateShape(id, { isHidden: !s.isHidden });
  };
  const toggleLocked = (id: string) => {
    const s = shapes.find((sh) => sh.id === id);
    if (!s) return;
    updateShape(id, { isLocked: !s.isLocked });
  };
  const bringFwd = (id: string) => bringForward(id);
  const sendBack = (id: string) => sendBackward(id);
  const remove = (id: string) => {
    if (shapes.some((s) => s.id === id)) removeShape(id);
    else if (images.some((i) => i.id === id)) removeImage(id);
  };

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

            // Controles
            const canReorder = true;
            const canRemove = true;
            const canHide = !isImage; // ocultar apenas para shapes/text
            const canLock = !isImage; // bloquear apenas para shapes/text

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
                      bringFwd(it.id);
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
                      sendBack(it.id);
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
                  <Icon size={16} className="shrink-0" />
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
