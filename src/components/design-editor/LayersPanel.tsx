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

/** Payloads aceitos do Canvas */
type LegacyShapeType =
  | "rect"
  | "text"
  | "circle"
  | "triangle"
  | "line"
  | "star";

type LegacyShape = {
  id: string;
  type: LegacyShapeType;
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
};

type LegacyImage = {
  id: string;
  type: "image";
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
};

type EditorStateMsg =
  | {
      // Modelo legado + imagens
      selectedId: string | null;
      selectedImageId?: string | null;
      selectedImageIds?: string[];
      shapes?: LegacyShape[];
      images?: LegacyImage[];
    }
  | {
      // Modelo unificado (compat futuro)
      selectedItemIds: string[];
      items: Array<
        (LegacyShape & { kind?: "shape" }) | (LegacyImage & { kind?: "image" })
      >;
    };

/** Item normalizado para o painel */
type PanelItem =
  | (LegacyShape & { kind: "shape" })
  | (LegacyImage & { kind: "image" });

type Props = {
  className?: string;
};

export default function LayersPanel({ className }: Props) {
  const [items, setItems] = useState<PanelItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const onState = (ev: Event) => {
      const e = ev as CustomEvent<EditorStateMsg>;
      const detail = e.detail as any;
      if (!detail) return;

      // --- Seleção ---
      if (Array.isArray(detail.selectedItemIds)) {
        setSelectedIds(detail.selectedItemIds);
      } else {
        const sel: string[] = [];
        if (Array.isArray(detail.selectedImageIds)) {
          sel.push(...detail.selectedImageIds);
        } else if (detail.selectedImageId) {
          sel.push(detail.selectedImageId);
        } else if (detail.selectedId) {
          sel.push(detail.selectedId);
        }
        setSelectedIds(sel);
      }

      // --- Itens (camadas) ---
      if (Array.isArray(detail.items)) {
        // Unificado
        const normalized: PanelItem[] = detail.items.map((it: any) => {
          if (it.kind === "image" || it.type === "image") {
            return { ...it, kind: "image", type: "image" } as PanelItem;
          }
          return { ...it, kind: "shape" } as PanelItem;
        });
        setItems(normalized);
        return;
      }

      // Legado: shapes + images separados
      const shapes: PanelItem[] = (detail.shapes ?? []).map(
        (s: LegacyShape) => ({
          ...s,
          kind: "shape",
        })
      );
      const images: PanelItem[] = (detail.images ?? []).map(
        (img: LegacyImage) => ({
          ...img,
          kind: "image",
          type: "image",
        })
      );

      // Ordem exibida: shapes primeiro (compat com render atual)
      setItems([...shapes, ...images]);
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

  const selectShape = (id: string) => dispatch("select", { id });
  const selectImage = (id: string) => {
    // compat: tentar ambos
    dispatch("select-image", { id });
    dispatch("select", { id });
  };

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
            const isImage = it.kind === "image";
            const iconKey: keyof typeof typeIcon = isImage
              ? "image"
              : (it.type as LegacyShapeType);
            const Icon = typeIcon[iconKey] || IconRect;

            const selected = isSelected(it.id);
            const actionsDisabled = isImage; // ações ainda não suportadas para imagens

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
                      actionsDisabled
                        ? "Reordenar indisponível para imagens"
                        : "Trazer para frente"
                    }
                    disabled={actionsDisabled}
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
                      actionsDisabled
                        ? "Reordenar indisponível para imagens"
                        : "Enviar para trás"
                    }
                    disabled={actionsDisabled}
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
                  onClick={() =>
                    isImage ? selectImage(it.id) : selectShape(it.id)
                  }
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    title={
                      actionsDisabled
                        ? "Ocultar/mostrar indisponível para imagens"
                        : it.isHidden
                        ? "Mostrar"
                        : "Ocultar"
                    }
                    disabled={actionsDisabled}
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
                    title={
                      actionsDisabled
                        ? "Bloquear/desbloquear indisponível para imagens"
                        : it.isLocked
                        ? "Desbloquear"
                        : "Bloquear"
                    }
                    disabled={actionsDisabled}
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
                    title={
                      isImage ? "Remoção via painel — em breve" : "Remover"
                    }
                    disabled={isImage}
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
