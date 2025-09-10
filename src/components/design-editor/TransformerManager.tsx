// src/components/design-editor/TransformerManager.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type Konva from "konva";
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
      // inclui shapes + texts
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

  // ---------- resolução robusta dos nós (sem CSS.escape e SEM filtrar "vivos" aqui) ----------
  const [rev, setRev] = useState(0);

  const resolveById = useCallback(
    (id: string): Konva.Node | null => {
      const stage = stageRef.current;
      let n: Konva.Node | null = null;
      try {
        // ids nossos são simples (ex: "text-xxxx", "rect-xxxx"): seletor direto funciona
        n = stage?.findOne<Konva.Node>(`#${id}`) ?? null;
      } catch {
        n = null;
      }
      if (!n) n = imageRefs.current[id] ?? null;
      if (!n) n = shapeRefs.current[id] ?? null;
      return n;
    },
    [stageRef, imageRefs, shapeRefs]
  );

  const rawNodes = useMemo(() => {
    // ordem: imagens, depois shapes (tanto faz para Transformer)
    const list: (Konva.Node | null)[] = [
      ...selectedImageIds.map(resolveById),
      ...selectedShapeIds.map(resolveById),
    ];
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    resolveById,
    selectedImageIds.join(","),
    selectedShapeIds.join(","),
    rev,
  ]);

  // Se há seleção mas ainda não achamos nenhum nó (tempo de mount), tenta de novo no próximo frame
  useEffect(() => {
    if (!hasSelection) return;
    if (rawNodes.every((n) => !n)) {
      const raf = requestAnimationFrame(() => setRev((r) => r + 1));
      return () => cancelAnimationFrame(raf);
    }
  }, [hasSelection, rawNodes]);

  // ---------- split: fallback para seleção mista texto + não-texto ----------
  const { textNodes, otherNodes, isMixedTypes } = useMemo(() => {
    const alive = rawNodes.filter(
      (n): n is Konva.Node => !!n && !(n as any).isDestroyed?.()
    ) as Konva.Node[];

    const t: Konva.Node[] = [];
    const o: Konva.Node[] = [];
    alive.forEach((n) => {
      const cls = (n as any).getClassName?.();
      if (cls === "Text") t.push(n);
      else o.push(n);
    });

    return {
      textNodes: t,
      otherNodes: o,
      isMixedTypes: t.length > 0 && o.length > 0,
    };
  }, [rawNodes]);

  if (!hasSelection) return null;

  // ---------- render ----------
  // Caso normal: um transformer para todos os nós
  // Fallback: em seleção mista texto+outros, renderiza DOIS transformers (um para cada grupo).
  if (!isMixedTypes) {
    return (
      <SelectionTransformer
        selectedNodes={[...textNodes, ...otherNodes]}
        getOptionsForSelection={(nodes) => {
          const hasOnlyImages =
            nodes.length > 0 &&
            nodes.every((n) => (n as any).getClassName?.() === "Image");
          const enabledAnchors = [
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ];
          return {
            keepRatio: hasOnlyImages,
            rotateEnabled: true,
            enabledAnchors,
            boundBoxFunc: hasOnlyImages
              ? (oldBox: any, newBox: any) => {
                  const w = Math.abs(newBox.width);
                  const h = Math.abs(newBox.height);
                  return w < 8 || h < 8 ? oldBox : newBox;
                }
              : undefined,
          };
        }}
      />
    );
  }

  // Fallback seguro para shape+texto: dois transformers, mesmos estilos/opções
  return (
    <>
      <SelectionTransformer
        selectedNodes={otherNodes}
        getOptionsForSelection={() => ({
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
        })}
      />
      <SelectionTransformer
        selectedNodes={textNodes}
        getOptionsForSelection={() => ({
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
        })}
      />
    </>
  );
}
