// src/components/design-editor/SelectionTransformer.tsx
"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
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

  // ⬇️ Rebind IMEDIATO do transformer quando a seleção muda (antes da pintura)
  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    if (nodes.length === 0) {
      // limpa quando não há seleção
      tr.nodes([]);
      tr.getLayer()?.batchDraw();
      return;
    }

    tr.nodes(nodes);
    // garante que fique no topo dentro da mesma Layer
    try {
      tr.moveToTop();
    } catch {
      /* noop */
    }
    const layer = tr.getLayer();
    layer?.batchDraw();

    // segundo tick garante cálculo de bbox já com layout estável
    const raf = requestAnimationFrame(() => {
      try {
        tr.forceUpdate();
        layer?.batchDraw();
        tr.getStage()?.batchDraw();
      } catch {
        /* noop */
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [nodes]);

  return (
    <Transformer
      ref={trRef}
      // visível só quando há nós (evita “fantasma”)
      visible={nodes.length > 0}
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
      listening
    />
  );
}
