// src/components/design-editor/SelectionTransformer.tsx
"use client";

import { useEffect, useMemo, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";

type SelectionOptions = {
  enabledAnchors?: string[];
  rotateEnabled?: boolean;
  keepRatio?: boolean;
  boundBoxFunc?: (oldBox: any, newBox: any) => any;
};

type Props = {
  selectedNode?: Konva.Node | null;
  selectedNodes?: (Konva.Node | null | undefined)[] | null;
  enabledAnchors?: string[];
  rotateEnabled?: boolean;
  keepRatio?: boolean;
  boundBoxFunc?: (oldBox: any, newBox: any) => any;
  getOptionsForSelection?: (nodes: Konva.Node[]) => SelectionOptions | void;
};

export default function SelectionTransformer({
  selectedNode,
  selectedNodes,
  enabledAnchors = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "middle-left",
    "middle-right",
    "top-center",
    "bottom-center",
  ],
  rotateEnabled = true,
  keepRatio = false,
  boundBoxFunc,
  getOptionsForSelection,
}: Props) {
  const trRef = useRef<Konva.Transformer>(null);

  const nodes: Konva.Node[] = useMemo(() => {
    const base =
      (selectedNodes && selectedNodes.length
        ? selectedNodes
        : selectedNode
        ? [selectedNode]
        : []) ?? [];
    return base.filter(
      (n): n is Konva.Node =>
        !!n && !(n as any).isDestroyed?.() && !!n.getStage()
    );
  }, [selectedNodes, selectedNode]);

  const dynamicOpts = useMemo<SelectionOptions>(() => {
    try {
      return getOptionsForSelection ? getOptionsForSelection(nodes) || {} : {};
    } catch {
      return {};
    }
  }, [getOptionsForSelection, nodes]);

  const finalEnabledAnchors = dynamicOpts.enabledAnchors ?? enabledAnchors;
  const finalRotateEnabled = dynamicOpts.rotateEnabled ?? rotateEnabled;
  const finalKeepRatio = dynamicOpts.keepRatio ?? keepRatio;
  const finalBoundBoxFunc = dynamicOpts.boundBoxFunc ?? boundBoxFunc;

  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();

    // ✅ depois do próximo frame, força o recálculo (útil p/ imagens que acabam de carregar)
    const raf = requestAnimationFrame(() => {
      try {
        tr.forceUpdate();
        tr.getLayer()?.batchDraw();
      } catch {
        /* noop */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes]);

  return (
    <Transformer
      ref={trRef}
      enabledAnchors={finalEnabledAnchors}
      rotateEnabled={finalRotateEnabled}
      keepRatio={finalKeepRatio}
      boundBoxFunc={finalBoundBoxFunc}
      padding={4}
      anchorSize={8}
      anchorCornerRadius={1}
      rotateAnchorOffset={20}
      anchorStrokeWidth={1}
      borderStrokeWidth={1}
      borderStroke={"#2b7fff"}
      anchorStroke={"#2b7fff"}
    />
  );
}
