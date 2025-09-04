// src/components/design-editor/TransformerManager.tsx
"use client";

import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";

type Props = {
  /** compat: seleção única */
  selectedId?: string | null;
  /** novo: múltipla seleção */
  selectedIds?: string[];
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
};

export default function TransformerManager({
  selectedId,
  selectedIds,
  shapeRefs,
}: Props) {
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const tr = trRef.current as any;
    if (!tr || typeof tr.nodes !== "function") return;

    const ids =
      (selectedIds && selectedIds.length
        ? selectedIds
        : selectedId
        ? [selectedId]
        : []) ?? [];

    const nodes: Konva.Node[] = ids
      .map((id) => shapeRefs.current[id!])
      .filter(
        (n): n is Konva.Node =>
          !!n && !(n as any).isDestroyed?.() && !!n.getStage()
      );

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
  }, [selectedId, selectedIds, shapeRefs]);

  return (
    <Transformer
      ref={trRef}
      padding={4}
      rotateEnabled
      anchorSize={8}
      anchorCornerRadius={1}
      rotateAnchorOffset={20}
      anchorStrokeWidth={1}
      borderStrokeWidth={1}
      borderStroke={"#2b7fff"}
      anchorStroke={"#2b7fff"}
      enabledAnchors={[
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ]}
    />
  );
}
