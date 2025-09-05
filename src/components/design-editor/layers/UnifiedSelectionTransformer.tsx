// src/components/design-editor/layers/UnifiedSelectionTransformer.tsx
"use client";

import { Layer } from "react-konva";
import type Konva from "konva";
import SelectionTransformer from "../SelectionTransformer";

type Props = {
  selectedNodes: (Konva.Node | null)[];
  getOptionsForSelection?: () => Parameters<
    typeof SelectionTransformer
  >[0]["getOptionsForSelection"] extends infer F
    ? F extends (...args: any) => any
      ? ReturnType<F>
      : any
    : any;
};

/**
 * Camada que exibe um único Transformer quando há seleção mista (imagens + shapes).
 * Mantém o mesmo contrato do SelectionTransformer para não quebrar nada.
 */
export default function UnifiedSelectionTransformer({
  selectedNodes,
  getOptionsForSelection,
}: Props) {
  const nodes = (selectedNodes || []).filter(Boolean) as Konva.Node[];
  if (nodes.length === 0) return null;

  return (
    <Layer name="UnifiedTransformerLayer">
      <SelectionTransformer
        selectedNodes={nodes}
        getOptionsForSelection={
          getOptionsForSelection ??
          (() => ({
            keepRatio: false,
            rotateEnabled: true,
            enabledAnchors: [
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ],
          }))
        }
      />
    </Layer>
  );
}
