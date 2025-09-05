// src/components/design-editor/layers/ShapesLayerWrapper.tsx
"use client";

import React, { useMemo } from "react";
import { Layer } from "react-konva";
import type Konva from "konva";
import ShapesLayer from "@/components/design-editor/ShapesLayer";
import type { AnyShape } from "@/components/design-editor/types/shapes";
import SelectionTransformer from "@/components/design-editor/SelectionTransformer";

type Props = {
  shapes: AnyShape[];
  selectedId: string | null;
  selectedIds: string[];
  onSelectShape: (id: string | null, multi?: boolean) => void;
  onMoveShape: (id: string, x: number, y: number) => void;
  /** Registro de refs dos nós konva, compartilhados com o Canvas */
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
  /** Altura do canvas – mantido por compatibilidade (não usado aqui) */
  canvasHeight: number;
  /** Quando true, este wrapper pode exibir um transformer local para formas (não-texto) */
  showTransformer?: boolean;
  /** Se true, renderiza também textos; por padrão este wrapper NÃO renderiza textos */
  renderTexts?: boolean;
};

export default function ShapesLayerWrapper({
  shapes,
  selectedId,
  selectedIds,
  onSelectShape,
  onMoveShape,
  shapeRefs,
  canvasHeight, // eslint-disable-line @typescript-eslint/no-unused-vars
  showTransformer = false,
  renderTexts = false,
}: Props) {
  // Este wrapper, por padrão, renderiza apenas formas NÃO-texto.
  // Textos são tratados separadamente em TextLayer no Canvas.
  const filtered = useMemo(() => {
    if (renderTexts) return shapes;
    return shapes.filter((s) => s.type !== "text");
  }, [shapes, renderTexts]);

  // Nós selecionados (apenas formas presentes neste wrapper)
  const selectedNodes = useMemo(() => {
    if (!showTransformer) return [] as Konva.Node[];
    const set = new Set(selectedIds);
    const nodes = filtered
      .filter((s) => set.has(s.id))
      .map((s) => shapeRefs.current[s.id])
      .filter(Boolean) as Konva.Node[];
    return nodes;
  }, [filtered, selectedIds, showTransformer, shapeRefs]);

  return (
    <>
      <Layer name="ShapesLayer">
        <ShapesLayer
          shapes={filtered}
          selectedId={selectedId}
          onSelectShape={onSelectShape}
          onMoveShape={onMoveShape}
          shapeRefs={shapeRefs}
        />
      </Layer>

      {/* Transformer LOCAL para seleção **apenas de formas** */}
      {showTransformer && selectedNodes.length > 0 && (
        <Layer name="ShapeTransformerLayer">
          <SelectionTransformer
            selectedNodes={selectedNodes}
            getOptionsForSelection={() => ({
              keepRatio: false,
              rotateEnabled: true,
              enabledAnchors: [
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
                "middle-left",
                "middle-right",
                "top-center",
                "bottom-center",
              ],
            })}
          />
        </Layer>
      )}
    </>
  );
}
