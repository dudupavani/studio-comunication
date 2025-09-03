// src/components/design-editor/hooks/useSelectionSync.ts
"use client";

import { useEffect } from "react";

// Tipos mínimos que espelham o Canvas (estruturais)
type ShapeKind = "rect" | "text" | "circle" | "triangle" | "line" | "star";

type ShapeBase = {
  id: string;
  type: ShapeKind;
  name?: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

type ShapeText = ShapeBase & {
  type: "text";
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  width?: number;
  height?: number;
  padding?: number;
};

function isShapeText(s: any): s is ShapeText {
  return s && s.type === "text";
}

type Defaults = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  line: {
    stroke: string;
    strokeWidth: number;
    opacity: number;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
  };
  text: {
    fill: string;
    opacity: number;
    text: string;
    fontFamily: string;
    fontSize: number;
    fontStyle: "normal" | "bold" | "italic" | "bold italic";
    align: "left" | "center" | "right" | "justify";
    lineHeight: number;
    letterSpacing: number;
    width: number;
    height: number;
    padding: number;
  };
};

type UseSelectionSyncArgs<TShape> = {
  selectedId: string | null;
  shapes: TShape[];
  defaults: Defaults;
};

export function useSelectionSync<
  TShape extends { id: string; type: ShapeKind }
>({ selectedId, shapes, defaults }: UseSelectionSyncArgs<TShape>) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sel =
      (selectedId &&
        (shapes.find((s) => s.id === selectedId) as any | undefined)) ||
      null;

    let detail: any = null;
    if (sel) {
      const base = {
        id: sel.id,
        type: sel.type,
        name: sel.name || sel.id,
        fill: sel.type === "line" ? undefined : sel.fill ?? defaults.fill,
        stroke:
          sel.type === "text"
            ? undefined
            : sel.stroke ??
              (sel.type === "line" ? defaults.line.stroke : defaults.stroke),
        strokeWidth:
          sel.strokeWidth ??
          (sel.type === "line"
            ? defaults.line.strokeWidth
            : defaults.strokeWidth),
        opacity: sel.opacity ?? defaults.opacity,
        shadowBlur: sel.shadowBlur ?? defaults.shadowBlur,
        shadowOffsetX: sel.shadowOffsetX ?? defaults.shadowOffsetX,
        shadowOffsetY: sel.shadowOffsetY ?? defaults.shadowOffsetY,
      };

      if (isShapeText(sel)) {
        detail = {
          ...base,
          text: sel.text ?? defaults.text.text,
          fontFamily: sel.fontFamily ?? defaults.text.fontFamily,
          fontSize: sel.fontSize ?? defaults.text.fontSize,
          fontStyle: sel.fontStyle ?? defaults.text.fontStyle,
          align: sel.align ?? defaults.text.align,
          lineHeight: sel.lineHeight ?? defaults.text.lineHeight,
          letterSpacing: sel.letterSpacing ?? defaults.text.letterSpacing,
          width: sel.width ?? defaults.text.width,
          height: sel.height ?? defaults.text.height,
          padding: sel.padding ?? defaults.text.padding,
        };
      } else {
        detail = base;
      }
    }

    window.dispatchEvent(
      new CustomEvent("design-editor:selection-props", { detail })
    );
  }, [selectedId, shapes, defaults]);
}
