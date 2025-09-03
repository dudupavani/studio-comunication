// src/components/design-editor/utils/konvaCache.ts
"use client";

import type Konva from "konva";
import { Text as KonvaTextNode } from "konva/lib/shapes/Text";

export function isKonvaTextNode(
  n: Konva.Node | null | undefined
): n is KonvaTextNode {
  return !!n && (n as any).className === "Text";
}

type TextPatch = Partial<{
  fontFamily: string;
  fontSize: number;
  fontStyle: "normal" | "bold" | "italic" | "bold italic";
  letterSpacing: number;
  lineHeight: number;
  align: "left" | "center" | "right" | "justify";
  width: number;
  height: number;
  padding: number;
  text: string;
}>;

export function applyTextPatchToNode(node: KonvaTextNode, pt: TextPatch) {
  if (pt.fontFamily !== undefined) node.fontFamily(pt.fontFamily);
  if (pt.fontSize !== undefined) node.fontSize(pt.fontSize);
  if (pt.fontStyle !== undefined) node.fontStyle(pt.fontStyle);
  if (pt.letterSpacing !== undefined) node.letterSpacing(pt.letterSpacing);
  if (pt.lineHeight !== undefined) node.lineHeight(pt.lineHeight);
  if (pt.align !== undefined) node.align(pt.align);
  if (pt.width !== undefined) node.width(pt.width);
  if (pt.height !== undefined) node.height(pt.height);
  if (pt.padding !== undefined) node.padding(pt.padding);
  if (pt.text !== undefined) node.text(pt.text);

  // força redesenho
  node.clearCache?.();
  node.getLayer()?.batchDraw?.();
}
