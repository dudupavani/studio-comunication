// src/components/design-editor/ArtboardLayer.tsx
"use client";

import { Layer, Rect } from "react-konva";

type Size = { width: number; height: number };

export default function ArtboardLayer({
  artboard,
  stageSize: _stageSize,
  pad: _pad = 200,
}: {
  artboard: Size;
  stageSize: Size;
  pad?: number;
}) {
  return (
    <Layer listening={false}>
      <Rect
        x={0}
        y={0}
        width={artboard.width}
        height={artboard.height}
        fill="#ffffff"
        stroke="#e5e7eb" // gray-200
        strokeWidth={1}
      />
    </Layer>
  );
}
