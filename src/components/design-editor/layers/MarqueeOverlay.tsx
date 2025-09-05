// src/components/design-editor/layers/MarqueeOverlay.tsx
"use client";

import { Layer, Rect } from "react-konva";

export type MarqueeState = {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

type Props = {
  marquee: MarqueeState;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
};

export default function MarqueeOverlay({
  marquee,
  fill = "rgba(43,127,255,0.10)",
  stroke = "#155dfc",
  strokeWidth = 1,
}: Props) {
  if (!marquee.active) return null;

  const x = Math.min(marquee.x1, marquee.x2);
  const y = Math.min(marquee.y1, marquee.y2);
  const w = Math.abs(marquee.x2 - marquee.x1);
  const h = Math.abs(marquee.y2 - marquee.y1);

  return (
    <Layer listening={false} name="MarqueeOverlay">
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </Layer>
  );
}
