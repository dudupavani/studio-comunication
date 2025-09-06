// src/components/design-editor/TransformerManager.tsx
"use client";

import { useCallback } from "react";
import type Konva from "konva";
import SelectionTransformer from "@/components/design-editor/SelectionTransformer";

type Props = {
  selectedNodes: Konva.Node[];
  hasOnlyImages: boolean;
};

export default function TransformerManager({
  selectedNodes,
  hasOnlyImages,
}: Props) {
  // Evita que imagens “sumam” quando muito pequenas
  const imageBoundBox = useCallback((oldBox: any, newBox: any) => {
    const w = Math.abs(newBox.width);
    const h = Math.abs(newBox.height);
    return w < 8 || h < 8 ? oldBox : newBox;
  }, []);

  // Retorna opções para o transformer conforme a seleção atual
  const getOptionsForSelection = useCallback(
    (_nodes: Konva.Node[]) => {
      // IMPORTANTE: array mutável (string[]), não "as const"
      const enabledAnchors: string[] = [
        "top-left",
        "top-right",
        "bottom-left",
        "bottom-right",
        "middle-left",
        "middle-right",
        "top-center",
        "bottom-center",
      ];

      return {
        keepRatio: !!hasOnlyImages,
        rotateEnabled: true,
        enabledAnchors,
        boundBoxFunc: hasOnlyImages ? imageBoundBox : undefined,
      };
    },
    [hasOnlyImages, imageBoundBox]
  );

  return (
    <SelectionTransformer
      selectedNodes={selectedNodes}
      getOptionsForSelection={getOptionsForSelection}
    />
  );
}
