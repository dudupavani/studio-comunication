"use client";

export type ShapeKind =
  | "rect"
  | "text"
  | "circle"
  | "triangle"
  | "line"
  | "star";

function normalizeType(t: string): ShapeKind {
  const v = (t || "").toLowerCase();
  if (v === "polygon" || v === "tri") return "triangle";
  return (
    ["rect", "text", "circle", "triangle", "line", "star"].includes(v)
      ? v
      : "text"
  ) as ShapeKind;
}

/**
 * API estável para o menu interagir com o Canvas sem acoplar em window/global.
 * Internamente disparamos o CustomEvent já suportado pelo Canvas.
 */
export function useDesignEditor() {
  function create(type: ShapeKind, coords?: { x?: number; y?: number }) {
    const detail = { type: normalizeType(type), ...coords };
    window.dispatchEvent(
      new CustomEvent("design-editor:create-shape", { detail })
    );
  }

  return { create };
}
