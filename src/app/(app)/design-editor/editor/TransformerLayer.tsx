"use client";

import React from "react";
import { Transformer } from "react-konva";
import Konva from "konva";

type ShapeSummary = { type: string } | undefined;
type ShapeMap = Record<string, ShapeSummary>;

type Props = {
  trRef: React.RefObject<Konva.Transformer>;
  selectedId: string | null;
  shapes: ShapeMap;
};

export default function TransformerLayer({ trRef, selectedId, shapes }: Props) {
  const isCircle = !!(selectedId && shapes[selectedId]?.type === "circle");

  const allAnchors = [
    "top-left",
    "top-center",
    "top-right",
    "middle-right",
    "bottom-right",
    "bottom-center",
    "bottom-left",
    "middle-left",
  ] as const;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled
      keepRatio={isCircle}
      enabledAnchors={[...allAnchors]}
      anchorSize={8}
      borderDash={[4, 4]}
      boundBoxFunc={(oldBox, nb) => {
        if (!isCircle) return nb;

        const anchor = trRef.current?.getActiveAnchor?.() ?? "";

        // limites mínimos para não “colapsar”
        const MIN = 6;

        // dimensões candidatas por tipo de anchor
        const sizeFromWidth = Math.max(MIN, Math.abs(nb.width));
        const sizeFromHeight = Math.max(MIN, Math.abs(nb.height));
        const sizeFromBoth = Math.max(
          MIN,
          Math.max(Math.abs(nb.width), Math.abs(nb.height))
        );

        // bordas e centro originais (para fixar o lado oposto ao anchor ativo)
        const oldLeft = oldBox.x;
        const oldRight = oldBox.x + oldBox.width;
        const oldTop = oldBox.y;
        const oldBottom = oldBox.y + oldBox.height;
        const oldCenterX = oldLeft + oldBox.width / 2;
        const oldCenterY = oldTop + oldBox.height / 2;

        switch (anchor) {
          // laterais → varia largura; altura ajusta para manter quadrado
          case "middle-right": {
            const size = sizeFromWidth;
            return {
              x: oldLeft,
              y: oldCenterY - size / 2,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }
          case "middle-left": {
            const size = sizeFromWidth;
            return {
              x: oldRight - size,
              y: oldCenterY - size / 2,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }

          // topo/baixo centrais → varia altura; largura ajusta para manter quadrado
          case "top-center": {
            const size = sizeFromHeight;
            return {
              x: oldCenterX - size / 2,
              y: oldBottom - size,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }
          case "bottom-center": {
            const size = sizeFromHeight;
            return {
              x: oldCenterX - size / 2,
              y: oldTop,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }

          // cantos → usa o maior de width/height pro quadrado e fixa o canto oposto
          case "top-left": {
            const size = sizeFromBoth;
            return {
              x: oldRight - size,
              y: oldBottom - size,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }
          case "top-right": {
            const size = sizeFromBoth;
            return {
              x: oldLeft,
              y: oldBottom - size,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }
          case "bottom-right": {
            const size = sizeFromBoth;
            return {
              x: oldLeft,
              y: oldTop,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }
          case "bottom-left": {
            const size = sizeFromBoth;
            return {
              x: oldRight - size,
              y: oldTop,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }

          // fallback: centraliza quadrado no box proposto
          default: {
            const size = sizeFromBoth;
            const cx = nb.x + nb.width / 2;
            const cy = nb.y + nb.height / 2;
            return {
              x: cx - size / 2,
              y: cy - size / 2,
              width: size,
              height: size,
              rotation: nb.rotation,
            };
          }
        }
      }}
    />
  );
}
