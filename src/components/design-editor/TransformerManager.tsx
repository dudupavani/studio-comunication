// src/components/design-editor/TransformerManager.tsx
"use client";

import { useCallback, useMemo } from "react";
import type Konva from "konva";
import SelectionTransformer from "@/components/design-editor/SelectionTransformer";
import { useSelectionContext } from "@/components/design-editor/SelectionContext";

type NodeMap = Record<string, Konva.Node | null>;

type Props = {
  shapeRefs: React.MutableRefObject<NodeMap>;
  imageRefs: React.MutableRefObject<NodeMap>;
};

export default function TransformerManager({ shapeRefs, imageRefs }: Props) {
  const { selection } = useSelectionContext();

  const { nodes, hasOnlyImages } = useMemo(() => {
    const selectedShapeIds: string[] = [];
    const selectedImageIds: string[] = [];

    if (!selection || selection.kind === "none") {
      // vazio
    } else if (selection.kind === "mixed") {
      selectedShapeIds.push(
        ...selection.shapeIds,
        ...(selection.textIds ?? [])
      );
      selectedImageIds.push(...selection.imageIds);
    } else if (selection.kind === "image") {
      selectedImageIds.push(...selection.ids);
    } else if (selection.kind === "shape" || selection.kind === "text") {
      selectedShapeIds.push(...selection.ids);
    }

    const nodes: (Konva.Node | null)[] = [];
    for (const id of selectedImageIds)
      nodes.push(imageRefs.current[id] ?? null);
    for (const id of selectedShapeIds)
      nodes.push(shapeRefs.current[id] ?? null);

    return {
      nodes: nodes.filter(Boolean) as Konva.Node[],
      hasOnlyImages:
        selectedImageIds.length > 0 && selectedShapeIds.length === 0,
    };
  }, [selection, shapeRefs, imageRefs]);

  // Evita que imagens “sumam” quando muito pequenas
  const imageBoundBox = useCallback((oldBox: any, newBox: any) => {
    const w = Math.abs(newBox.width);
    const h = Math.abs(newBox.height);
    return w < 8 || h < 8 ? oldBox : newBox;
  }, []);

  // Retorna opções conforme a seleção atual
  const getOptionsForSelection = useCallback(
    (_: Konva.Node[]) => {
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

  if (nodes.length === 0) return null;

  return (
    <SelectionTransformer
      selectedNodes={nodes}
      getOptionsForSelection={getOptionsForSelection}
    />
  );
}
