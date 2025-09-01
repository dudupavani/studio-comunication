"use client";

import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";

type Props = {
  selectedNode?: Konva.Node | null;
  enabledAnchors?: string[];
  rotateEnabled?: boolean;
  boundBoxFunc?: (oldBox: any, newBox: any) => any;
};

export default function SelectionTransformer({
  selectedNode,
  enabledAnchors = ["top-left","top-right","bottom-left","bottom-right","middle-left","middle-right","top-center","bottom-center"],
  rotateEnabled = true,
  boundBoxFunc,
}: Props) {
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    if (selectedNode) {
      tr.nodes([selectedNode]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedNode]);

  return (
    <Transformer
      ref={trRef}
      enabledAnchors={enabledAnchors}
      rotateEnabled={rotateEnabled}
      boundBoxFunc={boundBoxFunc}
    />
  );
}
