// src/components/design-editor/layers/ShapesLayerWrapper.tsx
"use client";

import React, { useCallback, useMemo } from "react";
import { Layer } from "react-konva";
import type Konva from "konva";
import ShapesLayer from "@/components/design-editor/ShapesLayer";
import type { AnyShape } from "@/components/design-editor/types/shapes";
import { useSelectionContext } from "@/components/design-editor/SelectionContext";

type Props = {
  shapes: AnyShape[];
  /** Mantido por compat (será removido depois) */
  selectedId: string | null;

  /** ✅ compat: se não vier do pai, usamos o contexto */
  onSelectShape?: (id: string | null, multi?: boolean) => void;

  onMoveShape: (id: string, x: number, y: number) => void;
  /** Registro de refs dos nós konva, compartilhados com o Canvas */
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
  /** Se true, renderiza também textos; por padrão este wrapper NÃO renderiza textos */
  renderTexts?: boolean;
};

export default function ShapesLayerWrapper({
  shapes,
  selectedId,
  onSelectShape,
  onMoveShape,
  shapeRefs,
  renderTexts = false,
}: Props) {
  const { selection, actions } = useSelectionContext();

  // Este wrapper, por padrão, renderiza apenas formas NÃO-texto.
  // Textos são tratados separadamente em TextLayer no Canvas.
  const filtered = useMemo(() => {
    if (renderTexts) return shapes;
    return shapes.filter((s) => s.type !== "text");
  }, [shapes, renderTexts]);

  // 🔁 último shape/text selecionado pelo contexto (fallback ao prop legado)
  const selectedIdFromContext = useMemo<string | null>(() => {
    if (selection.kind === "shape" || selection.kind === "text") {
      const ids = selection.ids;
      return ids.length ? ids[ids.length - 1] : null;
    }
    if (selection.kind === "mixed") {
      const ids = [...selection.shapeIds, ...(selection.textIds ?? [])];
      return ids.length ? ids[ids.length - 1] : null;
    }
    return null;
  }, [selection]);

  const effectiveSelectedId: string | null =
    selectedId ?? selectedIdFromContext;

  // ✅ seleção via contexto (fallback se pai não fornecer handler)
  const handleSelect = useCallback(
    (id: string | null, multi?: boolean) => {
      if (onSelectShape) {
        onSelectShape(id, multi);
        return;
      }
      if (id === null) {
        actions.clear();
        return;
      }
      if (multi) actions.toggle("shape", id);
      else actions.select("shape", id);
    },
    [onSelectShape, actions]
  );

  return (
    <Layer name="ShapesLayer">
      <ShapesLayer
        shapes={filtered}
        selectedId={effectiveSelectedId}
        onSelectShape={handleSelect}
        onMoveShape={onMoveShape}
        shapeRefs={shapeRefs}
      />
      {/* ⚠️ Sem transformer local: o unificado é gerido no Canvas pelo TransformerManager */}
    </Layer>
  );
}
