// src/components/design-editor/SelectionPropsEmitter.tsx
"use client";

import { useEffect } from "react";
import { DESIGN_DEFAULTS as DEFAULTS } from "@/components/design-editor/constants/design-defaults";
import type { AnyShape } from "@/components/design-editor/types/shapes";
import { isTextShapeStrict } from "@/components/design-editor/types/shapes";

type Props = {
  shapes: AnyShape[];
  selectedId: string | null;
};

export default function SelectionPropsEmitter({ shapes, selectedId }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sel =
      (selectedId &&
        (shapes.find((s) => s.id === selectedId) as AnyShape | undefined)) ||
      null;

    let detail: any = null;

    if (sel) {
      const base = {
        id: sel.id,
        type: sel.type,
        name: sel.name || sel.id,
        fill: sel.type === "line" ? undefined : sel.fill ?? DEFAULTS.fill,
        stroke:
          sel.type === "text"
            ? undefined
            : sel.stroke ??
              (sel.type === "line" ? DEFAULTS.line.stroke : DEFAULTS.stroke),
        strokeWidth:
          sel.strokeWidth ??
          (sel.type === "line"
            ? DEFAULTS.line.strokeWidth
            : DEFAULTS.strokeWidth),
        opacity: sel.opacity ?? DEFAULTS.opacity,
        shadowBlur: sel.shadowBlur ?? DEFAULTS.shadowBlur,
        shadowOffsetX: sel.shadowOffsetX ?? DEFAULTS.shadowOffsetX,
        shadowOffsetY: sel.shadowOffsetY ?? DEFAULTS.shadowOffsetY,
      };

      if (isTextShapeStrict(sel)) {
        detail = {
          ...base,
          text: sel.text ?? DEFAULTS.text.text,
          fontFamily: sel.fontFamily ?? DEFAULTS.text.fontFamily,
          fontSize: sel.fontSize ?? DEFAULTS.text.fontSize,
          fontStyle: sel.fontStyle ?? DEFAULTS.text.fontStyle,
          align: sel.align ?? DEFAULTS.text.align,
          lineHeight: sel.lineHeight ?? DEFAULTS.text.lineHeight,
          letterSpacing: sel.letterSpacing ?? DEFAULTS.text.letterSpacing,
          width: sel.width ?? DEFAULTS.text.width,
          height: sel.height ?? DEFAULTS.text.height,
          padding: sel.padding ?? DEFAULTS.text.padding,
        };
      } else {
        detail = base;
      }
    }

    window.dispatchEvent(
      new CustomEvent("design-editor:selection-props", { detail })
    );
  }, [shapes, selectedId]);

  return null;
}
