// src/app/(app)/design-editor/editor/StageView.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Stage, Text, Layer, Rect } from "react-konva";
import Konva from "konva";
import { useEditor } from "./store";
import TextEditOverlay from "./TextEditOverlay";
import NodesLayer from "./NodesLayer";
import TransformerLayer from "./TransformerLayer";

import { applyShapeLiveConstraint } from "./transform-rules";
import { getShapeEntry, isShapeType } from "./nodes/registry";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

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
    state: {
      shapes,
      order,
      selectedId,
      selectedIds,
      stage,
      editingId,
      stageZoom,
    },
    api: {
      selectOne,
      toggleSelect,
      updateShape,
      deleteSelected,
      startEditText,
      setStageRef,
      setStageZoom,
    },
  } = useEditor();

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const stageWrapperRef = useRef<HTMLDivElement>(null);

  const [offset, setOffset] = useState<XY>({ x: 0, y: 0 });
  const [zoomInput, setZoomInput] = useState(() =>
    Math.round((stageZoom ?? 1) * 100).toString()
  );

  const zoomSkipRef = useRef(false);
  const prevZoomRef = useRef(stageZoom);

  const clampZoom = useCallback((value: number) => {
    return Math.min(4, Math.max(0.1, value));
  }, []);

  const applyZoom = useCallback(
    (targetZoom: number, anchor?: XY) => {
      const newZoom = clampZoom(targetZoom);
      const oldZoom = stageZoom;
      if (Math.abs(newZoom - oldZoom) < 0.0001) return;

      const pivot = anchor ?? {
        x: stage.width / 2,
        y: stage.height / 2,
      };

      setOffset((prev) => ({
        x: prev.x + pivot.x * (oldZoom - newZoom),
        y: prev.y + pivot.y * (oldZoom - newZoom),
      }));

      zoomSkipRef.current = true;
      prevZoomRef.current = newZoom;
      setStageZoom(newZoom);
    },
    [clampZoom, stageZoom, stage.width, stage.height, setStageZoom]
  );

  useEffect(() => {
    if (!zoomSkipRef.current) {
      const prev = prevZoomRef.current;
      if (Math.abs(prev - stageZoom) > 0.0001) {
        const center = { x: stage.width / 2, y: stage.height / 2 };
        setOffset((prevOffset) => ({
          x: prevOffset.x + center.x * (prev - stageZoom),
          y: prevOffset.y + center.y * (prev - stageZoom),
        }));
      }
    }
    zoomSkipRef.current = false;
    prevZoomRef.current = stageZoom;
    setZoomInput(Math.round(stageZoom * 100).toString());
  }, [stageZoom, stage.width, stage.height]);

  const handleSliderChange = useCallback(
    (values: number[]) => {
      if (!values || values.length === 0) return;
      const next = values[0];
      setZoomInput(Math.round(next).toString());
      applyZoom(next / 100);
    },
    [applyZoom]
  );

  const commitZoomInput = useCallback(() => {
    const parsed = Number(zoomInput.replace(/,/g, "."));
    if (!Number.isFinite(parsed)) {
      setZoomInput(Math.round(stageZoom * 100).toString());
      return;
    }
    applyZoom(parsed / 100);
  }, [zoomInput, applyZoom, stageZoom]);

  const handleZoomInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setZoomInput(e.target.value);
    },
    []
  );

  const handleZoomInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitZoomInput();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setZoomInput(Math.round(stageZoom * 100).toString());
      }
    },
    [commitZoomInput, stageZoom]
  );
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

  useEffect(() => {
    if (stageRef.current) {
      setStageRef(stageRef.current);
    }
  }, [setStageRef]);

  useEffect(() => {
    const stageObj = stageRef.current;
    if (!stageObj) return;

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();

      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = direction > 0 ? 1.05 : 1 / 1.05;
      const nextZoom = stageZoom * factor;

      const pointer = stageObj.getPointerPosition();
      let anchor: XY | undefined;
      if (pointer) {
        anchor = {
          x: pointer.x / stageZoom,
          y: pointer.y / stageZoom,
        };
      }

      applyZoom(nextZoom, anchor);
    };

    stageObj.on("wheel", handleWheel);
    return () => {
      stageObj.off("wheel", handleWheel);
    };
  }, [applyZoom, stageZoom]);

  // ====== Panning ======
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;

    const onPointerDown = (e: PointerEvent) => {
      const stageEl = stageRef.current?.container();
      if (stageEl && e.target instanceof Node && stageEl.contains(e.target)) {
        return;
      }
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: offset.x,
        baseY: offset.y,
      };
      ws.setPointerCapture?.(e.pointerId);
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

  // ===== Keyboard =====
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

  // ===== Selection =====
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

  // ===== Drag =====
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

  // ===== Render nodes =====
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
            onTransformEnd={(evt: any) => {
              const node = evt.target as Konva.Text;
              const anchor = trRef.current?.getActiveAnchor?.() ?? "";

              if (anchor === "middle-left" || anchor === "middle-right") {
                // Só largura da caixa
                const sx = node.scaleX();
                if (sx !== 1) {
                  node.width(node.width() * sx);
                  node.scaleX(1);
                }
                node.scaleY(1);
              } else {
                // Escala completa nos cantos
                const sx = node.scaleX();
                const sy = node.scaleY();
                if (sx !== 1 || sy !== 1) {
                  node.fontSize((s.fontSize || 24) * sy);
                  node.width(node.width() * sx);
                  node.scaleX(1);
                  node.scaleY(1);
                }
              }

              updateShape(id, {
                x: node.x(),
                y: node.y(),
                width: node.width(),
                height: node.height(),
                rotation: node.rotation(),
                fontSize: node.fontSize(),
              });
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
          const t = node as Konva.Text; // força explicitamente para Text
          const anchor = trRef.current?.getActiveAnchor?.() ?? "";
          const sx = t.scaleX();
          const sy = t.scaleY();

          if (anchor === "middle-left" || anchor === "middle-right") {
            if (sx !== 1) {
              t.width(t.width() * sx);
              t.scaleX(1);
            }
            t.scaleY(1);
          } else {
            if (sx !== 1 || sy !== 1) {
              (t as Konva.Text).fontSize((t as Konva.Text).fontSize() * sy); // 👈 cast duplo
              t.width(t.width() * sx);
              t.scaleX(1);
              t.scaleY(1);
            }
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
      <div
        ref={stageWrapperRef}
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          willChange: "transform",
          position: "relative",
          zIndex: 0,
        }}>
        <Stage
          ref={stageRef}
          width={stage.width}
          height={stage.height}
          scaleX={stageZoom}
          scaleY={stageZoom}
          style={{
            display: "block",
            background: stage.background,
            boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
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

      <div className="absolute bottom-4 left-4 flex items-center gap-3 rounded-md bg-white/95 px-3 py-2 shadow-lg ring-1 ring-black/5">
        <Slider
          className="w-36"
          min={10}
          max={400}
          step={5}
          value={[Math.round(stageZoom * 100)]}
          onValueChange={handleSliderChange}
          aria-label="Zoom"
        />
        <div className="relative w-20">
          <Input
            value={zoomInput}
            onChange={handleZoomInputChange}
            onBlur={commitZoomInput}
            onKeyDown={handleZoomInputKeyDown}
            inputMode="decimal"
            className="h-8 pr-7 text-right text-sm"
            aria-label="Zoom em porcentagem"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs text-muted-foreground">
            %
          </span>
        </div>
      </div>
    </div>
  );
}
