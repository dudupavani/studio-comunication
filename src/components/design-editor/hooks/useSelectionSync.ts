// src/components/design-editor/hooks/useSelectionSync.ts
"use client";

import { useEffect } from "react";
import {
  AnyShape,
  isTextShapeStrict,
} from "@/components/design-editor/types/shapes";
import { DESIGN_DEFAULTS } from "@/components/design-editor/constants/design-defaults";

type UseSelectionSyncArgs = {
  selectedId: string | null;
  shapes: AnyShape[];
};

export function useSelectionSync({ selectedId, shapes }: UseSelectionSyncArgs) {
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
        fill:
          sel.type === "line" ? undefined : sel.fill ?? DESIGN_DEFAULTS.fill,
        stroke:
          sel.type === "text"
            ? undefined
            : sel.stroke ??
              (sel.type === "line"
                ? DESIGN_DEFAULTS.line.stroke
                : DESIGN_DEFAULTS.stroke),
        strokeWidth:
          sel.strokeWidth ??
          (sel.type === "line"
            ? DESIGN_DEFAULTS.line.strokeWidth
            : DESIGN_DEFAULTS.strokeWidth),
        opacity: sel.opacity ?? DESIGN_DEFAULTS.opacity,
        shadowBlur: sel.shadowBlur ?? DESIGN_DEFAULTS.shadowBlur,
        shadowOffsetX: sel.shadowOffsetX ?? DESIGN_DEFAULTS.shadowOffsetX,
        shadowOffsetY: sel.shadowOffsetY ?? DESIGN_DEFAULTS.shadowOffsetY,
      };

      if (isTextShapeStrict(sel)) {
        detail = {
          ...base,
          text: sel.text ?? DESIGN_DEFAULTS.text.text,
          fontFamily: sel.fontFamily ?? DESIGN_DEFAULTS.text.fontFamily,
          fontSize: sel.fontSize ?? DESIGN_DEFAULTS.text.fontSize,
          fontStyle: sel.fontStyle ?? DESIGN_DEFAULTS.text.fontStyle,
          align: sel.align ?? DESIGN_DEFAULTS.text.align,
          lineHeight: sel.lineHeight ?? DESIGN_DEFAULTS.text.lineHeight,
          letterSpacing:
            sel.letterSpacing ?? DESIGN_DEFAULTS.text.letterSpacing,
          width: sel.width ?? DESIGN_DEFAULTS.text.width,
          height: sel.height ?? DESIGN_DEFAULTS.text.height,
          padding: sel.padding ?? DESIGN_DEFAULTS.text.padding,
        };
      } else {
        detail = base;
      }
    }

    window.dispatchEvent(
      new CustomEvent("design-editor:selection-props", { detail })
    );
  }, [selectedId, shapes]);
}
