// src/app/(app)/design-editor/editor/StageView.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Text, Layer, Rect } from "react-konva";
import Konva from "konva";
import { useEditor } from "./store";
import TextEditOverlay from "./TextEditOverlay";
import NodesLayer from "./NodesLayer";
import TransformerLayer from "./TransformerLayer";

import { applyShapeLiveConstraint } from "./transform-rules";
import { getShapeEntry, isShapeType } from "./nodes/registry";

type XY = { x: number; y: number };

type DragSession = {
  active: boolean;
  leaderId: string | null;
  leaderStart: XY | null;
  base: Record<string, XY>;
  ids: string[];
};

const isMultiKey = (evt: any) =>
  !!(evt?.evt?.shiftKey || evt?.evt?.metaKey || evt?.evt?.ctrlKey);

export function StageView() {
  const {
    state: { shapes, order, selectedId, selectedIds, stage, editingId },
    api: {
      selectOne,
      toggleSelect,
      updateShape,
      deleteSelected,
      startEditText,
      setStageRef, // <<< adicionado
    },
  } = useEditor();

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Wrapper que contém o Stage (usado para panning fora do Stage
  // e como container do TextEditOverlay)
  const workspaceRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);

  // Offset do Stage dentro do workspace (panning externo)
  const [offset, setOffset] = useState<XY>({ x: 0, y: 0 });
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
  } | null>(null);

  const selectedIdsRef = useRef<string[]>(selectedIds);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  const dragRef = useRef<DragSession>({
    active: false,
    leaderId: null,
    leaderStart: null,
    base: {},
    ids: [],
  });

  // registra o stageRef no store
  useEffect(() => {
    if (stageRef.current) {
      setStageRef(stageRef.current);
    }
  }, [setStageRef]);

  // ====== Panning fora do Stage (no workspace cinza) ======
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;

    const onPointerDown = (e: PointerEvent) => {
      // Se clicou dentro do container do Konva (Stage), não inicia panning do workspace
      const stageEl = stageRef.current?.container();
      if (stageEl && e.target instanceof Node && stageEl.contains(e.target)) {
        return;
      }
      // Inicia panning do workspace
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: offset.x,
        baseY: offset.y,
      };
      ws.setPointerCapture?.(e.pointerId);
      // Cursor de feedback
      ws.style.cursor = "grabbing";
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panStartRef.current) return;
      const { startX, startY, baseX, baseY } = panStartRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      setOffset({ x: baseX + dx, y: baseY + dy });
    };

    const onPointerUp = (e: PointerEvent) => {
      panStartRef.current = null;
      ws.releasePointerCapture?.(e.pointerId);
      ws.style.cursor = "";
    };

    ws.addEventListener("pointerdown", onPointerDown);
    ws.addEventListener("pointermove", onPointerMove);
    ws.addEventListener("pointerup", onPointerUp);
    ws.addEventListener("pointerleave", onPointerUp);

    return () => {
      ws.removeEventListener("pointerdown", onPointerDown);
      ws.removeEventListener("pointermove", onPointerMove);
      ws.removeEventListener("pointerup", onPointerUp);
      ws.removeEventListener("pointerleave", onPointerUp);
    };
  }, [offset.x, offset.y]);

  // ===== Transformer =====
  useEffect(() => {
    const tr = trRef.current;
    const st = stageRef.current;
    if (!tr || !st) return;

    if (selectedIds.length > 0) {
      const nodes: Konva.Node[] = [];
      for (const id of selectedIds) {
        const n = st.findOne<Konva.Node>(`#${id}`);
        if (n) nodes.push(n);
      }
      tr.nodes(nodes);

      const hasText = nodes.some((n) => n.getClassName() === "Text");
      if (hasText) {
        tr.enabledAnchors([
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
          "middle-left",
          "middle-right",
        ]);
      } else {
        const anchors = [
          "top-left",
          "top-right",
          "bottom-left",
          "bottom-right",
          "middle-left",
          "middle-right",
          "top-center",
          "bottom-center",
        ];

        const hideCenters = nodes.some((n) => {
          const s = shapes[n.id()];
          return (
            s &&
            isShapeType(s.type) &&
            getShapeEntry(s.type).policyKeys.includes("hideTopBottomCenters")
          );
        });

        tr.enabledAnchors(
          hideCenters
            ? anchors.filter((a) => a !== "top-center" && a !== "bottom-center")
            : anchors
        );
      }
    } else {
      tr.nodes([]);
    }

    tr.moveToTop();
    tr.getLayer()?.batchDraw();
    tr.getStage()?.batchDraw();
  }, [selectedIds, shapes, order]);

  // ===== Teclas globais =====
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "Escape") selectOne(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [deleteSelected, selectOne]);

  // ===== Seleção =====
  const handleSelect = (id: string, isMulti: boolean) => {
    if (editingId) return;
    const cur = selectedIdsRef.current;

    if (isMulti) {
      if (!cur.includes(id)) {
        selectedIdsRef.current = [...cur, id];
        toggleSelect(id);
      }
      return;
    }

    if (cur.includes(id) && cur.length > 1) {
      return;
    }

    selectedIdsRef.current = [id];
    selectOne(id);
  };

  // ===== Multi-drag =====
  const handleDragStart = (id: string, node: Konva.Node, isShift?: boolean) => {
    let ids = selectedIdsRef.current;
    if (isShift && !ids.includes(id)) ids = [...ids, id];

    if (!ids.includes(id) || ids.length <= 1) {
      dragRef.current = {
        active: false,
        leaderId: id,
        leaderStart: null,
        base: {},
        ids: [id],
      };
      return;
    }

    const base: Record<string, XY> = {};
    for (const sid of ids) {
      const s = shapes[sid];
      if (s) base[sid] = { x: s.x, y: s.y };
    }

    dragRef.current = {
      active: true,
      leaderId: id,
      leaderStart: { x: node.x(), y: node.y() },
      base,
      ids,
    };
  };

  const handleDragMove = (id: string, node: Konva.Node) => {
    const sess = dragRef.current;
    if (!sess.active || sess.leaderId !== id || !sess.leaderStart) return;

    const dx = node.x() - sess.leaderStart.x;
    const dy = node.y() - sess.leaderStart.y;

    const st = stageRef.current;
    if (!st) return;

    for (const sid of sess.ids) {
      if (sid === id) continue;
      const base = sess.base[sid];
      if (!base) continue;
      const target = st.findOne<Konva.Node>(`#${sid}`);
      if (!target) continue;

      const s = shapes[sid];
      let tx = base.x + dx;
      let ty = base.y + dy;
      if (s?.type === "circle") {
        tx += s.width / 2;
        ty += s.height / 2;
      }

      target.position({ x: tx, y: ty });
    }

    trRef.current?.forceUpdate?.();
    trRef.current?.getLayer()?.batchDraw();
    stageRef.current?.batchDraw();
  };

  const handleDragEnd = (id: string, node: Konva.Node) => {
    const sess = dragRef.current;

    if (sess.active && sess.leaderId === id && sess.leaderStart) {
      const dx = node.x() - sess.leaderStart.x;
      const dy = node.y() - sess.leaderStart.y;

      for (const sid of sess.ids) {
        if (sid === id) continue;
        const base = sess.base[sid];
        if (!base) continue;
        updateShape(sid, { x: base.x + dx, y: base.y + dy });
      }
    }

    const nx = node.x();
    const ny = node.y();
    const s = shapes[id];
    if (s?.type === "circle") {
      updateShape(id, { x: nx - s.width / 2, y: ny - s.height / 2 });
    } else {
      updateShape(id, { x: nx, y: ny });
    }

    dragRef.current = {
      active: false,
      leaderId: null,
      leaderStart: null,
      base: {},
      ids: [],
    };
  };

  // ===== Render dos nodes =====
  const shapeNodes = useMemo(() => {
    return order.map((id) => {
      const s = shapes[id];
      if (!s) return null;

      if (isShapeType(s.type)) {
        const { Component } = getShapeEntry(s.type);
        return (
          <Component
            key={`shape-${id}`}
            id={id}
            s={s as any}
            editing={!!editingId}
            onSelect={(tid: string, isShift?: boolean) =>
              handleSelect(tid, !!isShift)
            }
            onUpdate={updateShape}
            onDragStart={(tid: string, n: Konva.Node, isShift?: boolean) =>
              handleDragStart(tid, n, isShift)
            }
            onDragMove={(tid: string, n: Konva.Node) => handleDragMove(tid, n)}
            onDragEnd={(tid: string, n: Konva.Node) => handleDragEnd(tid, n)}
          />
        );
      }

      if (s.type === "text") {
        const commonText = {
          onMouseDown: (evt: any) => {
            handleSelect(id, isMultiKey(evt));
            evt.cancelBubble = true;
          },
          onTap: (evt: any) => {
            handleSelect(id, false);
            evt.cancelBubble = true;
          },
          onDragStart: (evt: any) =>
            handleDragStart(id, evt.target, isMultiKey(evt)),
          onDragMove: (evt: any) => handleDragMove(id, evt.target),
          onDragEnd: (evt: any) => handleDragEnd(id, evt.target),
          draggable: s.draggable && !editingId,
          rotation: s.rotation,
          stroke: s.stroke,
          strokeWidth: s.strokeWidth ?? 0,
          fill: s.fill,
          id,
          name: s.type,
        };

        return (
          <Text
            key={`text-${id}`}
            {...commonText}
            x={s.x}
            y={s.y}
            width={s.width}
            text={s.text ?? ""}
            fontSize={s.fontSize || 24}
            fontFamily={s.fontFamily}
            fontStyle={s.fontStyle}
            align={s.align}
            onDblClick={() => startEditText(id)}
            onDblTap={() => startEditText(id)}
          />
        );
      }

      return null;
    });
  }, [order, shapes, editingId, startEditText, updateShape]);

  // ===== Transform live handler =====
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;

    const handler = () => {
      const nodes = tr.nodes();
      if (!nodes || nodes.length === 0) return;

      for (const node of nodes) {
        const cls = node.getClassName();

        if (cls === "Text") {
          const sx = node.scaleX();
          const sy = node.scaleY();
          if (sx !== 1 && Math.abs(sy - 1) < 0.001) {
            node.width(node.width() * sx);
            node.scaleX(1);
          }
          continue;
        }

        if (cls === "Circle") {
          applyShapeLiveConstraint(node);
          continue;
        }
      }

      tr.getLayer()?.batchDraw();
      tr.getStage()?.batchDraw();
    };

    tr.on("transform", handler);
    return () => {
      tr.off("transform", handler);
    };
  }, []);

  return (
    <div
      ref={workspaceRef}
      className="w-full h-full flex items-center justify-center overflow-hidden relative">
      {/* Wrapper do Stage (artboard), respeita layout */}
      <div
        ref={stageWrapperRef}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          willChange: "transform",
          position: "relative", // garante que fique no fluxo
          zIndex: 0, // impede sobreposição fora do workspace
        }}>
        <Stage
          ref={stageRef}
          width={stage.width}
          height={stage.height}
          style={{
            display: "block",
            background: stage.background,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.1)", // borda opcional
          }}
          onMouseDown={(e: any) => {
            if (editingId) return;
            if (e.target === e.target.getStage()) selectOne(null);
          }}>
          <Layer>
            <Rect
              x={0}
              y={0}
              width={stage.width}
              height={stage.height}
              fill={stage.background}
              listening={false}
            />
          </Layer>

          <NodesLayer>
            {shapeNodes}
            <TransformerLayer
              trRef={trRef}
              selectedId={selectedId}
              shapes={shapes}
            />
          </NodesLayer>
        </Stage>
      </div>

      <TextEditOverlay
        container={stageWrapperRef.current}
        stageRef={stageRef}
      />
    </div>
  );
}
