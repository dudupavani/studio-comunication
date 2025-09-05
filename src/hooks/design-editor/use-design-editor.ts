// src/hooks/design-editor/use-design-editor.ts
"use client";

import {
  normalizeType,
  type ShapeKind,
} from "@/components/design-editor/types/shapes";

export function useDesignEditor() {
  function create(type: ShapeKind, coords?: { x?: number; y?: number }) {
    const detail = { type: normalizeType(type), ...coords };
    window.dispatchEvent(
      new CustomEvent("design-editor:create-shape", { detail })
    );
  }

  return { create };
}
