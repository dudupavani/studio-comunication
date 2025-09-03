// src/components/design-editor/HintOverlay.tsx
"use client";

import { Text as KonvaText } from "react-konva";

type Props = {
  selectedId: string | null;
  canvasHeight: number;
  paddingX?: number; // default: 16
  offsetY?: number; // default: 28
  fontSize?: number; // default: 14
  fill?: string; // default: "#374151"
};

export default function HintOverlay({
  selectedId,
  canvasHeight,
  paddingX = 16,
  offsetY = 28,
  fontSize = 14,
  fill = "#374151",
}: Props) {
  const y = Math.max(0, canvasHeight - offsetY);
  const text = selectedId
    ? "Dica: selecione para mover/transformar. Delete/Backspace remove o elemento."
    : "Dica: arraste itens do painel para o canvas, ou clique no menu para criar. Clique para selecionar; arraste para mover; use as alças para redimensionar/rotacionar.";

  return (
    <KonvaText
      text={text}
      x={paddingX}
      y={y}
      fontSize={fontSize}
      fill={fill}
      listening={false}
    />
  );
}
