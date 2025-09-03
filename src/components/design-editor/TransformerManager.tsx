// src/components/design-editor/TransformerManager.tsx
"use client";

import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";

type Props = {
  selectedId: string | null;
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
  rotateEnabled?: boolean;
  enabledAnchors?: string[]; // opcional para customizações futuras
};

export default function TransformerManager({
  selectedId,
  shapeRefs,
  rotateEnabled = true,
  enabledAnchors,
}: Props) {
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    const node = selectedId ? shapeRefs.current[selectedId] : null;
    if (node) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw?.();
  }, [selectedId, shapeRefs, shapeRefs.current[selectedId ?? ""]]);

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={rotateEnabled}
      enabledAnchors={enabledAnchors}
    />
  );
}
