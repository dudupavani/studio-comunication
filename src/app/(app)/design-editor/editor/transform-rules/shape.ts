// src/app/(app)/design-editor/editor/transform-rules/shape.ts
import Konva from "konva";

/**
 * Regras DURANTE o gesto (transform) para formas.
 * ✅ Somente Circle mantém proporção 1:1 (evita elipse).
 */
export function applyShapeLiveConstraint(node: Konva.Node) {
  const cls = node.getClassName?.();
  if (cls === "Circle") {
    const sx = node.scaleX?.() ?? 1;
    const sy = node.scaleY?.() ?? 1;
    if (Math.abs(sx - sy) > 0.001) {
      const uni = Math.max(Math.abs(sx), Math.abs(sy));
      node.scaleX?.(uni);
      node.scaleY?.(uni);
    }
  }
}

/**
 * Persiste o transform ao FINAL do gesto (transformend).
 * - Converte scale -> width/height (usa width/height do node * scale total)
 * - Zera scale para evitar acúmulo
 * - Corrige coordenada para nosso sistema top-left
 *   * Center-based (Circle/Star/RegularPolygon): center → top-left
 */
export function commitShapeTransform(node: Konva.Node) {
  const sx = node.scaleX?.() ?? 1;
  const sy = node.scaleY?.() ?? 1;
  const cls = node.getClassName?.();

  // LINE: mantemos simples, width/height da bbox e posição top-left
  if (cls === "Line") {
    const x = node.x?.() ?? 0;
    const y = node.y?.() ?? 0;
    return {
      x,
      y,
      width: (node as any).width?.() ?? 0,
      height: (node as any).height?.() ?? 0,
      rotation: node.rotation?.() ?? 0,
    };
  }

  // width/height "base" (não inclui scale)
  const baseW =
    typeof (node as any).width === "function" ? (node as any).width() : 0;
  const baseH =
    typeof (node as any).height === "function" ? (node as any).height() : 0;

  // width/height finais (incluindo o scale total aplicado pelo Transformer)
  const newW = Math.max(5, Math.round(baseW * sx));
  const newH = Math.max(5, Math.round(baseH * sy));

  // reset do scale (vamos representar o tamanho via estado → próxima render aplica scaleX/Y pelos width/height)
  if (typeof node.scaleX === "function") node.scaleX(1);
  if (typeof node.scaleY === "function") node.scaleY(1);

  let x: number;
  let y: number;

  if (cls === "Circle" || cls === "Star" || cls === "RegularPolygon") {
    // Center-based → converter para top-left
    x = (node.x?.() ?? 0) - newW / 2;
    y = (node.y?.() ?? 0) - newH / 2;
  } else {
    // Rect, etc. → já é top-left
    x = node.x?.() ?? 0;
    y = node.y?.() ?? 0;
  }

  return {
    x,
    y,
    width: newW,
    height: newH,
    rotation: node.rotation?.() ?? 0,
  };
}
