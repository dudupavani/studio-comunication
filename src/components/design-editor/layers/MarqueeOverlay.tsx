// src/components/design-editor/layers/MarqueeOverlay.tsx
"use client";
import { Group, Rect } from "react-konva";

type Marquee = {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};
type Props = { marquee: Marquee };

export default function MarqueeOverlay({ marquee }: Props) {
  if (!marquee.active) return null;

  const x = Math.min(marquee.x1, marquee.x2);
  const y = Math.min(marquee.y1, marquee.y2);
  const w = Math.abs(marquee.x2 - marquee.x1);
  const h = Math.abs(marquee.y2 - marquee.y1);

  return (
    <Group listening={false}>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        stroke="#3b82f6"
        strokeWidth={1}
        strokeScaleEnabled={false} // ✅ stroke 1px, não escala com zoom
        dash={[4, 4]} // ✅ dash também não escala
        fill="rgba(59,130,246,0.08)"
        shadowForStrokeEnabled={false}
        perfectDrawEnabled={false}
        listening={false}
      />
    </Group>
  );
}
