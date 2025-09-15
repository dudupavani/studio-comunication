// src/app/(app)/design-editor/editor/StageView.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Text } from "react-konva";
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
      setStageSize,
      startEditText,
    },
  } = useEditor();

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [containerSize, setContainerSize] = useState({
    w: stage.width,
    h: stage.height,
  });

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

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(400, Math.floor(e.contentRect.width));
        const h = Math.max(300, Math.floor(e.contentRect.height));
        setContainerSize({ w, h });
        setStageSize(w, h);
      }
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
    };
  }, [setStageSize]);

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

        // aplica regra hideTopBottomCenters se alguma das formas tiver essa policy
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
            key={id}
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
            key={id}
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
            onTransformEnd={(evt: any) => {
              const node = evt.target as Konva.Text;
              const sx = node.scaleX();
              const sy = node.scaleY();

              const changedByWidthOnly = sx !== 1 && sy === 1;
              const changedByHeightOnly = sy !== 1 && sx === 1;
              const changedByCorner = sx !== 1 && sy !== 1;

              if (changedByWidthOnly) {
                updateShape(id, {
                  x: node.x(),
                  y: node.y(),
                  rotation: node.rotation(),
                  width: Math.max(20, node.width() * sx),
                });
              } else if (changedByCorner) {
                updateShape(id, {
                  x: node.x(),
                  y: node.y(),
                  rotation: node.rotation(),
                  width: Math.max(20, node.width() * sx),
                  fontSize: Math.max(8, (s.fontSize || 24) * sy),
                });
              }

              node.scaleX(1);
              node.scaleY(1);
            }}
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
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: "100%" }}>
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        style={{ background: stage.background }}
        onMouseDown={(e: any) => {
          if (editingId) return;
          if (e.target === e.target.getStage()) selectOne(null);
        }}>
        <NodesLayer>
          {shapeNodes}
          <TransformerLayer
            trRef={trRef}
            selectedId={selectedId}
            shapes={shapes}
          />
        </NodesLayer>
      </Stage>

      <TextEditOverlay container={containerRef.current} stageRef={stageRef} />
    </div>
  );
}
