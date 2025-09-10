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

  // fallbacks (se getOptionsForSelection não retornar)
  enabledAnchors?: string[];
  rotateEnabled?: boolean;
  keepRatio?: boolean;
  boundBoxFunc?: (oldBox: any, newBox: any) => any;

  // permite customizar conforme a seleção real
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

  // lista “crua” recebida do Manager
  const rawList = useMemo(() => {
    const base =
      (selectedNodes && selectedNodes.length
        ? selectedNodes
        : selectedNode
        ? [selectedNode]
        : []) ?? [];
    return base;
  }, [selectedNodes, selectedNode]);

  // util: filtra apenas nós vivos/montados no Stage
  const filterAlive = (arr: (Konva.Node | null | undefined)[]) =>
    arr.filter(
      (n): n is Konva.Node =>
        !!n && !!n.getStage?.() && !(n as any).isDestroyed?.()
    ) as Konva.Node[];

  // === attach/sync ===========================================================
  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    let cancelled = false;
    let rafId: number | null = null;
    const MAX_FRAMES = 10;
    let attempts = 0;

    const attach = () => {
      if (cancelled) return;

      try {
        const alive = filterAlive(rawList);

        // LOG DIAGNÓSTICO (pode remover depois)
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.debug(
            "[ST] alive:",
            alive.map((n) => ({
              id: (n as any).id?.() ?? (n as any).attrs?.id,
              cls: (n as any).getClassName?.(),
              layer:
                (n.getLayer() as any)?.attrs?.name ??
                (n.getLayer() as any)?.name?.(),
            }))
          );
        }

        if (alive.length) {
          // 1) opções dinâmicas primeiro (algumas opções influenciam layout)
          let opts: SelectionOptions = {};
          if (typeof getOptionsForSelection === "function") {
            try {
              opts = getOptionsForSelection(alive) || {};
            } catch {
              /* noop */
            }
          }

          // aplicar opções de forma tolerante
          const anchors = opts.enabledAnchors ?? enabledAnchors;
          try {
            (tr as any).enabledAnchors?.(anchors);
          } catch {}

          const rot = opts.rotateEnabled ?? rotateEnabled;
          try {
            (tr as any).rotateEnabled?.(!!rot);
          } catch {}

          const kr = opts.keepRatio ?? keepRatio;
          try {
            (tr as any).keepRatio?.(!!kr);
          } catch {}

          const bbf = opts.boundBoxFunc ?? boundBoxFunc;
          if (bbf) {
            try {
              (tr as any).boundBoxFunc?.(bbf);
            } catch {}
          }

          // 2) só então anexa os nós
          tr.nodes(alive);
          tr.moveToTop();

          // 3) força redesenho
          try {
            tr.forceUpdate();
            tr.getLayer()?.batchDraw();
            tr.getStage()?.batchDraw();
          } catch {}

          return; // sucesso
        }
      } catch {
        /* noop */
      }

      // retry curto (timing de mount)
      attempts += 1;
      if (attempts < MAX_FRAMES) {
        rafId = requestAnimationFrame(attach);
      }
    };

    attach();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [
    rawList,
    getOptionsForSelection,
    enabledAnchors,
    rotateEnabled,
    keepRatio,
    boundBoxFunc,
  ]);

  // mantém sincronizado durante drag/transform dos nós
  useLayoutEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    const NS = ".seltr";

    const safeUpdate = () => {
      try {
        const current = filterAlive(
          (tr.nodes?.() ?? []) as (Konva.Node | null)[]
        );
        if (current.length !== (tr.nodes?.() ?? []).length) {
          tr.nodes(current);
        }
        tr.forceUpdate();
        tr.getLayer()?.batchDraw();
        tr.getStage()?.batchDraw();
      } catch {}
    };

    // listeners em cada nó atual
    const currentNodes = ((tr.nodes?.() ?? []) as Konva.Node[]) || [];
    currentNodes.forEach((n) => {
      try {
        (n as any).off?.(NS);
        (n as any).on?.(`dragmove${NS}`, safeUpdate);
        (n as any).on?.(`transform${NS}`, safeUpdate);
        (n as any).on?.(`dragend${NS}`, safeUpdate);
        (n as any).on?.(`transformend${NS}`, safeUpdate);
        (n as any).on?.(`destroy${NS}`, safeUpdate);
      } catch {}
    });

    // listeners no stage (mudanças que afetam bounding box)
    const stage = tr.getStage();
    try {
      stage?.off(NS);
      stage?.on(`dragmove${NS}`, safeUpdate);
      stage?.on(`mouseup${NS}`, safeUpdate);
      stage?.on(`touchend${NS}`, safeUpdate);
    } catch {}

    return () => {
      try {
        currentNodes.forEach((n) => (n as any).off?.(NS));
        stage?.off(NS);
      } catch {}
    };
  }, [rawList]);

  return (
    <Transformer
      ref={trRef}
      visible={true}
      padding={4}
      anchorSize={8}
      anchorCornerRadius={1}
      rotateAnchorOffset={20}
      anchorStrokeWidth={1}
      borderStrokeWidth={1}
      borderStroke={"#2b7fff"}
      anchorStroke={"#2b7fff"}
      ignoreStroke={true}
      listening
    />
  );
}
