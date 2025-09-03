// src/hooks/design-editor/use-shape-refs.ts
"use client";

import { useRef } from "react";
import type Konva from "konva";
import { Text as KonvaTextNode } from "konva/lib/shapes/Text";

function isKonvaTextNode(n: Konva.Node | null | undefined): n is KonvaTextNode {
  if (!n) return false;
  const cls = (n as any).className ?? (n as any).getClassName?.();
  return cls === "Text";
}

export function useShapeRefs() {
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});

  const getNode = (id: string) => shapeRefs.current[id] ?? null;

  const getTextNode = (id: string): KonvaTextNode | null => {
    const n = getNode(id);
    return isKonvaTextNode(n) ? (n as KonvaTextNode) : null;
  };

  const clearCacheAndRedraw = (id: string) => {
    const n = getNode(id);
    // força recálculo quando propriedades de fonte mudam
    (n as any)?.clearCache?.();
    (n as any)?.getLayer?.()?.batchDraw?.();
  };

  return { shapeRefs, getTextNode, clearCacheAndRedraw };
}
