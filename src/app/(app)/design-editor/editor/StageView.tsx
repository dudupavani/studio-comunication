"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect, Circle, Transformer, Text } from "react-konva";
import Konva from "konva";
import { useEditor } from "./store";
import TextEditOverlay from "./TextEditOverlay";

export function StageView() {
  const {
    state: { shapes, order, selectedId, stage, editingId },
    api: { select, updateShape, deleteSelected, setStageSize, startEditText },
  } = useEditor();

  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [containerSize, setContainerSize] = useState({
    w: stage.width,
    h: stage.height,
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
    return () => ro.disconnect();
  }, [setStageSize]);

  useEffect(() => {
    const tr = trRef.current;
    const st = stageRef.current;
    if (!tr || !st) return;
    if (selectedId) {
      const node = st.findOne(`#${selectedId}`) as Konva.Node | null;
      tr.nodes(node ? [node] : []);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, shapes, order]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") deleteSelected();
      if (e.key === "Escape") select(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelected, select]);

  const shapeNodes = useMemo(() => {
    return order.map((id) => {
      const s = shapes[id];
      if (!s) return null;

      const common = {
        onMouseDown: (evt: any) => {
          select(id);
          evt.cancelBubble = true;
        },
        onTap: (evt: any) => {
          select(id);
          evt.cancelBubble = true;
        },
        onDragEnd: (evt: any) => {
          const node = evt.target as Konva.Node & {
            x: () => number;
            y: () => number;
          };
          updateShape(id, { x: node.x(), y: node.y() });
        },
        draggable: s.draggable && !editingId, // não arrastar enquanto edita texto
        rotation: s.rotation,
        stroke: s.stroke,
        strokeWidth: s.strokeWidth ?? 0,
        fill: s.fill,
        id,
        name: s.type,
      };

      if (s.type === "rect") {
        return (
          <Rect
            key={id}
            {...common}
            x={s.x}
            y={s.y}
            width={s.width}
            height={s.height}
            onTransformEnd={(evt: any) => {
              const node = evt.target as Konva.Rect;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              const newW = Math.max(5, Math.round(node.width() * scaleX));
              const newH = Math.max(5, Math.round(node.height() * scaleY));
              node.scaleX(1);
              node.scaleY(1);
              updateShape(id, {
                x: node.x(),
                y: node.y(),
                width: newW,
                height: newH,
                rotation: node.rotation(),
              });
            }}
          />
        );
      }

      if (s.type === "circle") {
        const radius = Math.max(3, Math.min(s.width, s.height) / 2);
        return (
          <Circle
            key={id}
            {...common}
            x={s.x + s.width / 2}
            y={s.y + s.height / 2}
            radius={radius}
            onDragEnd={(evt: any) => {
              const node = evt.target as Konva.Circle;
              updateShape(id, {
                x: node.x() - s.width / 2,
                y: node.y() - s.height / 2,
              });
            }}
            onTransformEnd={(evt: any) => {
              const node = evt.target as Konva.Circle;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              const newR = Math.max(
                3,
                Math.round(node.radius() * Math.max(scaleX, scaleY))
              );
              node.scaleX(1);
              node.scaleY(1);
              const newSize = newR * 2;
              updateShape(id, {
                x: node.x() - newR,
                y: node.y() - newR,
                width: newSize,
                height: newSize,
                rotation: node.rotation(),
              });
            }}
          />
        );
      }

      if (s.type === "text") {
        return (
          <Text
            key={id}
            {...common}
            x={s.x}
            y={s.y}
            width={s.width}
            text={s.text ?? ""} // usa o valor salvo
            fontSize={s.fontSize || 24}
            fontFamily={s.fontFamily}
            fontStyle={s.fontStyle}
            align={s.align}
            onDblClick={() => startEditText(id)}
            onDblTap={() => startEditText(id)}
            onTransformEnd={(evt: any) => {
              const node = evt.target as Konva.Text;
              const scaleX = node.scaleX();
              const scaleY = node.scaleY();
              const newW = Math.max(
                20,
                Math.round((node.width() || s.width) * scaleX)
              );
              const newH = Math.max(
                20,
                Math.round((node.height() || s.height) * scaleY)
              );
              node.scaleX(1);
              node.scaleY(1);
              updateShape(id, {
                x: node.x(),
                y: node.y(),
                width: newW,
                height: newH,
                rotation: node.rotation(),
              });
            }}
          />
        );
      }

      return null;
    });
  }, [order, shapes, select, updateShape, editingId, startEditText]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Stage
        ref={stageRef}
        width={containerSize.w}
        height={containerSize.h}
        style={{ background: stage.background }}
        onMouseDown={(e: any) => {
          // >>> FIX: não sair do modo de edição antes do blur commitar
          if (editingId) return;
          if (e.target === e.target.getStage()) {
            select(null);
          }
        }}>
        <Layer>
          {shapeNodes}
          <Transformer
            ref={trRef}
            rotateEnabled
            enabledAnchors={[
              "top-left",
              "top-center",
              "top-right",
              "middle-right",
              "bottom-right",
              "bottom-center",
              "bottom-left",
              "middle-left",
            ]}
            anchorSize={8}
            borderDash={[4, 4]}
            boundBoxFunc={(oldBox, newBox) => {
              const id = selectedId;
              if (!id) return newBox;
              const s = shapes[id];
              if (!s) return newBox;
              if (s.type === "circle") {
                const size = Math.max(newBox.width, newBox.height);
                return { ...newBox, width: size, height: size };
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>

      {/* Editor de texto DOM sobreposto */}
      <TextEditOverlay container={containerRef.current} stageRef={stageRef} />
    </div>
  );
}
