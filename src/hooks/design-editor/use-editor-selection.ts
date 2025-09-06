// src/hooks/design-editor/use-editor-selection.ts
"use client";

import { useMemo } from "react";
import type Konva from "konva";
import type React from "react";
import type { AnyShape } from "@/components/design-editor/types/shapes";
import { isTextShapeStrict } from "@/components/design-editor/types/shapes";

type Args = {
  selectedIds: string[];
  selectedImageIds: string[];
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
  imageRefs: React.MutableRefObject<Record<string, Konva.Group | null>>;
  shapes: AnyShape[];
};

export function useEditorSelection({
  selectedIds,
  selectedImageIds,
  shapeRefs,
  imageRefs,
  shapes,
}: Args) {
  // Resolve nós selecionados (único lugar que toca nos refs)
  const selectedNodes = useMemo(() => {
    const nodes: (Konva.Node | null)[] = [];
    // Mantém a mesma ordem usada antes: imagens depois shapes (ou vice-versa),
    // aqui seguimos a lógica anterior do Canvas (imagens -> shapes).
    for (const id of selectedImageIds)
      nodes.push(imageRefs.current[id] ?? null);
    for (const id of selectedIds) nodes.push(shapeRefs.current[id] ?? null);
    return nodes.filter(Boolean) as Konva.Node[];
  }, [selectedIds, selectedImageIds, shapeRefs, imageRefs]);

  const hasMixedSelection =
    selectedIds.length > 0 && selectedImageIds.length > 0;

  const hasOnlyImages = selectedImageIds.length > 0 && selectedIds.length === 0;

  const hasOnlyTextSelection = useMemo(() => {
    if (selectedImageIds.length > 0 || selectedIds.length === 0) return false;
    // todos os selectedIds devem apontar para shapes de texto
    const set = new Set(selectedIds);
    for (const s of shapes) {
      if (!set.has(s.id)) continue;
      if (!isTextShapeStrict(s)) return false;
    }
    // Se algum id não foi encontrado em shapes, consideramos "não somente texto"
    // (mesma postura conservadora do código anterior)
    for (const id of selectedIds) {
      if (!shapes.find((sh) => sh.id === id)) return false;
    }
    return true;
  }, [selectedIds, selectedImageIds, shapes]);

  const hasAnySelection = selectedIds.length + selectedImageIds.length > 0;

  return {
    selectedNodes,
    hasMixedSelection,
    hasOnlyImages,
    hasOnlyTextSelection,
    hasAnySelection,
  };
}
