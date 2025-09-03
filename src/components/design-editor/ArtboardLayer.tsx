// src/components/design-editor/ArtboardLayer.tsx
"use client";

import { Layer, Rect } from "react-konva";

type Size = { width: number; height: number };

export function computeArtboardPosition(
  stageSize: Size,
  artboardSize: Size,
  pad: number = 200
) {
  const x = Math.max((stageSize.width - artboardSize.width) / 2, pad);
  const y = Math.max((stageSize.height - artboardSize.height) / 2, pad);
  return { x, y };
}

export default function ArtboardLayer({
  artboard,
  stageSize,
  pad = 200,
}: {
  artboard: Size;
  stageSize: Size;
  pad?: number;
}) {
  const { x, y } = computeArtboardPosition(stageSize, artboard, pad);

  return (
    <Layer listening={false}>
      <Rect
        x={x}
        y={y}
        width={artboard.width}
        height={artboard.height}
        fill="#ffffff"
        stroke="#e5e7eb" // gray-200
        strokeWidth={1}
      />
    </Layer>
  );
}
