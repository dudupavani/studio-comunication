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
  /**
   * Compat: seleção única (uso antigo)
   */
  selectedNode?: Konva.Node | null;

  /**
   * Novo: múltiplos nós selecionados (substitui selectedNode quando fornecido)
   */
  selectedNodes?: (Konva.Node | null | undefined)[] | null;

  /**
   * Opções estáticas (defaults) — usadas quando getOptionsForSelection não retorna algo
   */
  enabledAnchors?: string[];
  rotateEnabled?: boolean;
  keepRatio?: boolean;
  boundBoxFunc?: (oldBox: any, newBox: any) => any;

  /**
   * Opções dinâmicas por seleção atual (tem precedência sobre as estáticas acima)
   */
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

  // Lista final de nós válidos (prioriza selectedNodes; cai para selectedNode)
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

  // Opções dinâmicas baseadas na seleção atual
  const dynamicOpts = useMemo<SelectionOptions>(() => {
    try {
      return getOptionsForSelection ? getOptionsForSelection(nodes) || {} : {};
    } catch {
      // Em caso de erro no callback do chamador, mantemos as opções estáticas
      return {};
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOptionsForSelection, nodes]);

  // Opções finais: dinâmicas têm precedência sobre estáticas
  const finalEnabledAnchors = dynamicOpts.enabledAnchors ?? enabledAnchors;
  const finalRotateEnabled = dynamicOpts.rotateEnabled ?? rotateEnabled;
  const finalKeepRatio = dynamicOpts.keepRatio ?? keepRatio;
  const finalBoundBoxFunc = dynamicOpts.boundBoxFunc ?? boundBoxFunc;

  // Atualiza os nós no Transformer
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    tr.nodes(nodes);
    tr.getLayer()?.batchDraw();
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
