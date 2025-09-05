// src/components/design-editor/layers/ShapesLayerWrapper.tsx
"use client";

import React, { useMemo } from "react";
import { Layer } from "react-konva";
import type Konva from "konva";
import ShapesLayer from "@/components/design-editor/ShapesLayer";
import type { AnyShape } from "@/components/design-editor/types/shapes";

type Props = {
  shapes: AnyShape[];
  selectedId: string | null;
  selectedIds: string[];
  onSelectShape: (id: string | null, multi?: boolean) => void;
  onMoveShape: (id: string, x: number, y: number) => void;
  /** Registro de refs dos nós (compatível com Canvas.tsx) */
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
  /** Altura do canvas – mantido por compatibilidade (não usado aqui) */
  canvasHeight: number;
  /** Quando true, este wrapper pode exibir um transformer local (não usado aqui para evitar conflitos) */
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
  showTransformer, // eslint-disable-line @typescript-eslint/no-unused-vars
  renderTexts = false,
}: Props) {
  // Este wrapper, por padrão, renderiza apenas formas NÃO-texto.
  // Textos são tratados separadamente em TextLayer no Canvas.
  const filtered = useMemo(() => {
    if (renderTexts) return shapes;
    return shapes.filter((s) => s.type !== "text");
  }, [shapes, renderTexts]);

  return (
    <Layer name="ShapesLayer">
      <ShapesLayer
        shapes={filtered}
        selectedId={selectedId}
        onSelectShape={onSelectShape}
        onMoveShape={onMoveShape}
        shapeRefs={shapeRefs}
      />
    </Layer>
  );
}
