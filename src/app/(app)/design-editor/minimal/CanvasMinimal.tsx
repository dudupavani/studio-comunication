"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect, Transformer } from "react-konva";

export default function CanvasMinimal() {
  const rectRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const [selected, setSelected] = useState(false);

  useLayoutEffect(() => {
    const tr = trRef.current;
    const node = rectRef.current;
    if (!tr) return;

    if (selected && node) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }

    tr.getLayer()?.batchDraw();
  }, [selected]);

  return (
    <Stage
      width={600}
      height={600}
      onMouseDown={(e: any) => {
        if (e.target === e.target.getStage()) setSelected(false);
      }}>
      <Layer>
        <Rect
          ref={rectRef}
          x={100}
          y={80}
          width={200}
          height={120}
          fill="tomato"
          draggable
          onMouseDown={(evt: any) => {
            setSelected(true);
            evt.cancelBubble = true;
          }}
          onTap={(evt: any) => {
            setSelected(true);
            evt.cancelBubble = true;
          }}
        />
        <Transformer ref={trRef} visible={selected} />
      </Layer>
    </Stage>
  );
}
