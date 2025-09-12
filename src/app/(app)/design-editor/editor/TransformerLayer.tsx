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
  const type = selectedId ? shapes[selectedId]?.type : undefined;
  const isCircle = type === "circle";
  const isText = type === "text";

  const anchorsDefault = [
    "top-left",
    "top-center",
    "top-right",
    "middle-right",
    "bottom-right",
    "bottom-center",
    "bottom-left",
    "middle-left",
  ] as const;

  // Texto: sem top-center / bottom-center (só cantos + laterais)
  const anchorsText = [
    "top-left",
    "top-right",
    "bottom-right",
    "bottom-left",
    "middle-left",
    "middle-right",
  ] as const;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled
      keepRatio={isCircle}
      enabledAnchors={isText ? [...anchorsText] : [...anchorsDefault]}
      anchorSize={8}
      borderDash={[4, 4]}
      boundBoxFunc={(oldBox, nb) => {
        // === Circulo (mantém quadrado) - preserva seu comportamento atual ===
        if (isCircle) {
          const anchor = trRef.current?.getActiveAnchor?.() ?? "";
          const MIN = 6;

          const sizeFromWidth = Math.max(MIN, Math.abs(nb.width));
          const sizeFromHeight = Math.max(MIN, Math.abs(nb.height));
          const sizeFromBoth = Math.max(
            MIN,
            Math.max(Math.abs(nb.width), Math.abs(nb.height))
          );

          const oldLeft = oldBox.x;
          const oldRight = oldBox.x + oldBox.width;
          const oldTop = oldBox.y;
          const oldBottom = oldBox.y + oldBox.height;
          const oldCenterX = oldLeft + oldBox.width / 2;
          const oldCenterY = oldTop + oldBox.height / 2;

          switch (anchor) {
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
        }

        // === Texto (não pode "esticar" vertical) ===
        if (isText) {
          const anchor = trRef.current?.getActiveAnchor?.() ?? "";
          const EPS = 0.5; // tolerância numérica (evita drift flutuante)
          const MIN_W = 20;

          // Mudança detectada
          const dw = nb.width - oldBox.width;
          const dh = nb.height - oldBox.height;
          const widthChanged = Math.abs(dw) > EPS;
          const heightChanged = Math.abs(dh) > EPS;

          // 1) Bloquear resize vertical puro (igual Canvas: ignorar)
          if (!widthChanged && heightChanged) {
            return oldBox;
          }

          // 2) Laterais → só largura (altura permanece igual)
          if (anchor === "middle-left" || anchor === "middle-right") {
            const newW = Math.max(MIN_W, Math.abs(nb.width));
            if (anchor === "middle-right") {
              // fixa lado esquerdo
              return {
                x: oldBox.x,
                y: oldBox.y,
                width: newW,
                height: oldBox.height,
                rotation: nb.rotation,
              };
            } else {
              // middle-left: fixa lado direito
              const newX = oldBox.x + (oldBox.width - newW);
              return {
                x: newX,
                y: oldBox.y,
                width: newW,
                height: oldBox.height,
                rotation: nb.rotation,
              };
            }
          }

          // 3) Cantos → uniformizar (altura segue proporcional à largura)
          //    Evita "esticar" em Y: amarra scaleY ao scaleX
          if (
            anchor === "top-left" ||
            anchor === "top-right" ||
            anchor === "bottom-right" ||
            anchor === "bottom-left"
          ) {
            const oldLeft = oldBox.x;
            const oldRight = oldBox.x + oldBox.width;
            const oldTop = oldBox.y;
            const oldBottom = oldBox.y + oldBox.height;

            const newW = Math.max(MIN_W, Math.abs(nb.width));
            const scaleX = newW / Math.max(MIN_W, oldBox.width);
            const newH = Math.max(8, oldBox.height * scaleX);

            switch (anchor) {
              case "top-left":
                return {
                  x: oldRight - newW,
                  y: oldBottom - newH,
                  width: newW,
                  height: newH,
                  rotation: nb.rotation,
                };
              case "top-right":
                return {
                  x: oldLeft,
                  y: oldBottom - newH,
                  width: newW,
                  height: newH,
                  rotation: nb.rotation,
                };
              case "bottom-right":
                return {
                  x: oldLeft,
                  y: oldTop,
                  width: newW,
                  height: newH,
                  rotation: nb.rotation,
                };
              case "bottom-left":
                return {
                  x: oldRight - newW,
                  y: oldTop,
                  width: newW,
                  height: newH,
                  rotation: nb.rotation,
                };
            }
          }

          // 4) Fallback seguro (caso âncora não identificada)
          return {
            x: nb.x,
            y: nb.y,
            width: Math.max(MIN_W, Math.abs(nb.width)),
            height: oldBox.height, // evita alterar altura sem necessidade
            rotation: nb.rotation,
          };
        }

        // Demais tipos: sem restrição adicional
        return nb;
      }}
    />
  );
}
