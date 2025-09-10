// src/components/design-editor/TransformerManager.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type Konva from "konva";
import { Rect } from "react-konva";
import SelectionTransformer from "@/components/design-editor/SelectionTransformer";
import { useSelectionContext } from "@/components/design-editor/SelectionContext";

type NodeMap = Record<string, Konva.Node | null>;

type Props = {
  shapeRefs: React.MutableRefObject<NodeMap>;
  imageRefs: React.MutableRefObject<NodeMap>;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
};

export default function TransformerManager({
  shapeRefs,
  imageRefs,
  stageRef,
}: Props) {
  const { selection } = useSelectionContext();

  const { selectedShapeIds, selectedImageIds, hasSelection } = useMemo(() => {
    const sIds: string[] = [];
    const iIds: string[] = [];

    if (!selection || selection.kind === "none") {
      // nada
    } else if (selection.kind === "mixed") {
      sIds.push(...selection.shapeIds, ...(selection.textIds ?? []));
      iIds.push(...selection.imageIds);
    } else if (selection.kind === "image") {
      iIds.push(...selection.ids);
    } else if (selection.kind === "shape" || selection.kind === "text") {
      sIds.push(...selection.ids);
    }
    return {
      selectedShapeIds: sIds,
      selectedImageIds: iIds,
      hasSelection: sIds.length > 0 || iIds.length > 0,
    };
  }, [selection]);

  const [rev, setRev] = useState(0);

  const resolveById = useCallback(
    (id: string): Konva.Node | null => {
      const stage = stageRef.current;
      let n: Konva.Node | null = null;
      try {
        n = stage?.findOne<Konva.Node>(`#${id}`) ?? null;
      } catch {}
      if (!n) n = imageRefs.current[id] ?? null;
      if (!n) n = shapeRefs.current[id] ?? null;
      return n;
    },
    [stageRef, imageRefs, shapeRefs]
  );

  const rawNodes = useMemo(() => {
    return [
      ...selectedImageIds.map(resolveById),
      ...selectedShapeIds.map(resolveById),
    ] as (Konva.Node | null)[];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolveById,
    selectedImageIds.join(","),
    selectedShapeIds.join(","),
    rev,
  ]);

  // Se há seleção mas ainda não achamos nenhum nó (timing de mount), tenta no próximo frame
  useEffect(() => {
    if (!hasSelection) return;
    if (rawNodes.every((n) => !n)) {
      const raf = requestAnimationFrame(() => setRev((r) => r + 1));
      return () => cancelAnimationFrame(raf);
    }
  }, [hasSelection, rawNodes]);

  // ⚠️ NÃO filtramos por getStage() aqui. Deixamos o SelectionTransformer tratar a “vida” do nó.
  const candidateNodes = useMemo(
    () => rawNodes.filter(Boolean) as Konva.Node[],
    [rawNodes]
  );

  // assinatura para remount quando o conjunto muda
  const nodesSig = useMemo(
    () =>
      candidateNodes
        .map(
          (n) =>
            `${(n as any).getClassName?.()}:${
              (n as any).id?.() ?? (n as any).attrs?.id ?? "?"
            }`
        )
        .join("|"),
    [candidateNodes]
  );

  // separa por tipo (Texto x Outros)
  const { textNodes, otherNodes, isMixedTypes } = useMemo(() => {
    const t: Konva.Node[] = [];
    const o: Konva.Node[] = [];
    candidateNodes.forEach((n) => {
      const cls = (n as any).getClassName?.();
      if (cls === "Text") t.push(n);
      else o.push(n);
    });
    return {
      textNodes: t,
      otherNodes: o,
      isMixedTypes: t.length > 0 && o.length > 0,
    };
  }, [candidateNodes]);

  // HUD magenta robusto
  const debugBBox = useMemo(() => {
    if (candidateNodes.length === 0) return null;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    let anyRect = false;

    candidateNodes.forEach((n) => {
      try {
        // pode falhar se o nó ainda não está no stage; ignoramos
        const r = n.getClientRect({ skipTransform: false, skipShadow: true });
        if (
          !isFinite(r.x) ||
          !isFinite(r.y) ||
          !isFinite(r.width) ||
          !isFinite(r.height)
        )
          return;
        minX = Math.min(minX, r.x);
        minY = Math.min(minY, r.y);
        maxX = Math.max(maxX, r.x + r.width);
        maxY = Math.max(maxY, r.y + r.height);
        anyRect = true;
      } catch {}
    });

    if (!anyRect) return null;

    const stage = stageRef.current;
    // tenta a layer do primeiro nó; se não tiver, procura pela nossa "UnifiedLayer"
    const layerFromNode = candidateNodes[0]?.getLayer?.() ?? null;
    const layerByName =
      (stage?.findOne?.<Konva.Layer>(".UnifiedLayer") as Konva.Layer | null) ??
      null;
    const layer = layerFromNode || layerByName;
    if (!layer) return null;

    const tr = layer.getAbsoluteTransform().copy();
    tr.invert();
    const p1 = tr.point({ x: minX, y: minY });
    const p2 = tr.point({ x: maxX, y: maxY });

    return {
      x: p1.x,
      y: p1.y,
      width: Math.max(1, p2.x - p1.x),
      height: Math.max(1, p2.y - p1.y),
    };
  }, [candidateNodes, stageRef]);

  if (!hasSelection) return null;

  // anchors mutáveis (evita erro 'readonly')
  const ENABLED_ANCHORS: string[] = [
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
    "middle-left",
    "middle-right",
    "top-center",
    "bottom-center",
  ];

  const hasOnlyImages =
    candidateNodes.length > 0 &&
    candidateNodes.every((n) => (n as any).getClassName?.() === "Image");

  // ---------- render ----------
  const singleTransformer = (
    <SelectionTransformer
      key={`tr-${nodesSig}`}
      selectedNodes={candidateNodes}
      enabledAnchors={ENABLED_ANCHORS}
      rotateEnabled={true}
      keepRatio={hasOnlyImages}
      boundBoxFunc={
        hasOnlyImages
          ? (oldBox: any, newBox: any) => {
              const w = Math.abs(newBox.width);
              const h = Math.abs(newBox.height);
              return w < 8 || h < 8 ? oldBox : newBox;
            }
          : undefined
      }
    />
  );

  const dualTransformers = (
    <>
      <SelectionTransformer
        key={`trA-${nodesSig}`}
        selectedNodes={otherNodes}
        enabledAnchors={ENABLED_ANCHORS}
        rotateEnabled={true}
      />
      <SelectionTransformer
        key={`trB-${nodesSig}`}
        selectedNodes={textNodes}
        enabledAnchors={ENABLED_ANCHORS}
        rotateEnabled={true}
      />
    </>
  );

  return (
    <>
      {debugBBox && (
        <Rect
          x={debugBBox.x}
          y={debugBBox.y}
          width={debugBBox.width}
          height={debugBBox.height}
          stroke="#ff00aa"
          dash={[6, 6]}
          dashEnabled
          listening={false}
          perfectDrawEnabled={false}
          name="DebugSelectionBBox"
        />
      )}
      {isMixedTypes ? dualTransformers : singleTransformer}
    </>
  );
}
