"use client";

import { useState, useRef, useEffect } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import type Konva from "konva";

const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export default function CanvasGroupDemo() {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [selection, setSelection] = useState<string[]>([]);
  const nodesRef = useRef<Record<string, Konva.Node | null>>({});

  // controle multi-drag
  const multiDragRef = useRef<{
    active: boolean;
    driverId: string | null;
    driverStart: { x: number; y: number } | null;
    nodesStart: Record<string, { x: number; y: number }>;
  }>({
    active: false,
    driverId: null,
    driverStart: null,
    nodesStart: {},
  });

  const shapes = [
    { id: "rect1", type: "rect", x: 80, y: 80, w: 120, h: 80, fill: "tomato" },
    {
      id: "text1",
      type: "text",
      x: 250,
      y: 120,
      text: "KonvaJS",
      fill: "blue",
    },
    { id: "img1", type: "image", x: 150, y: 250, w: 100, h: 100 },
  ];

  // aplica transformer sobre os selecionados
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const nodes = selection
      .map((id) => nodesRef.current[id])
      .filter(Boolean) as Konva.Node[];
    tr.nodes(nodes);
    tr.forceUpdate(); // 👈 garante bbox correto já no início
    tr.getLayer()?.batchDraw();
  }, [selection]);

  const handleStageMouseDown = (e: any) => {
    if (e.target === e.target.getStage()) {
      setSelection([]);
    }
  };

  // Não resetar seleção se o item já estiver selecionado
  const handleNodeClick = (id: string, evt: any) => {
    evt.cancelBubble = true;

    if (selection.includes(id)) {
      // já faz parte da seleção: não altera (permite arrastar sem perder seleção)
      return;
    }

    if (evt.evt.shiftKey) {
      setSelection((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      );
    } else {
      setSelection([id]);
    }
  };

  // listeners globais do stage para multi-drag
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onDragStart = (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target as Konva.Node;
      const id = node.id?.();
      if (!id) return;

      if (selection.includes(id) && selection.length > 1) {
        // multi-drag inicia
        const snapshot: Record<string, { x: number; y: number }> = {};
        selection.forEach((sid) => {
          const snode = nodesRef.current[sid];
          if (snode) snapshot[sid] = { x: snode.x(), y: snode.y() };
        });

        multiDragRef.current = {
          active: true,
          driverId: id,
          driverStart: { x: node.x(), y: node.y() },
          nodesStart: snapshot,
        };
      }
    };

    const onDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!multiDragRef.current.active) return;
      const { driverId, driverStart, nodesStart } = multiDragRef.current;
      if (!driverId || !driverStart) return;

      const driverNode = e.target as Konva.Node;
      const dx = driverNode.x() - driverStart.x;
      const dy = driverNode.y() - driverStart.y;

      // move todos os outros nós junto
      selection.forEach((sid) => {
        if (sid === driverId) return;
        const snode = nodesRef.current[sid];
        const start = nodesStart[sid];
        if (snode && start) {
          snode.position({ x: start.x + dx, y: start.y + dy });
        }
      });

      // 👇 manter o Transformer ajustado ao conjunto atualizado
      const tr = trRef.current;
      tr?.forceUpdate(); // 👈 recalcula anchors/bbox
      tr?.getLayer()?.batchDraw();
      stage.batchDraw();
    };

    const onDragEnd = () => {
      multiDragRef.current.active = false;

      // 🔁 uma última atualização do Transformer para garantir bbox final correto
      const tr = trRef.current;
      tr?.forceUpdate();
      tr?.getLayer()?.batchDraw();
      stage.batchDraw();
    };

    stage.on("dragstart", onDragStart);
    stage.on("dragmove", onDragMove);
    stage.on("dragend", onDragEnd);

    return () => {
      stage.off("dragstart", onDragStart);
      stage.off("dragmove", onDragMove);
      stage.off("dragend", onDragEnd);
    };
  }, [selection]);

  return (
    <Stage
      ref={stageRef}
      width={600}
      height={500}
      style={{ border: "1px solid #ccc", background: "#f9f9f9" }}
      onMouseDown={handleStageMouseDown}>
      <Layer>
        {shapes.map((s) => {
          if (s.type === "rect")
            return (
              <Rect
                key={s.id}
                id={s.id}
                ref={(n) => (nodesRef.current[s.id] = n)}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                fill={s.fill}
                draggable
                onMouseDown={(e) => handleNodeClick(s.id, e)}
                onTap={(e) => handleNodeClick(s.id, e)}
              />
            );
          if (s.type === "text")
            return (
              <Text
                key={s.id}
                id={s.id}
                ref={(n) => (nodesRef.current[s.id] = n)}
                x={s.x}
                y={s.y}
                text={s.text}
                fontSize={24}
                fill={s.fill}
                draggable
                onMouseDown={(e) => handleNodeClick(s.id, e)}
                onTap={(e) => handleNodeClick(s.id, e)}
              />
            );
          if (s.type === "image")
            return (
              <KonvaImage
                key={s.id}
                id={s.id}
                ref={(n) => (nodesRef.current[s.id] = n)}
                x={s.x}
                y={s.y}
                width={s.w}
                height={s.h}
                image={(() => {
                  const img = new window.Image();
                  img.src = TRANSPARENT_1PX;
                  return img;
                })()}
                draggable
                onMouseDown={(e) => handleNodeClick(s.id, e)}
                onTap={(e) => handleNodeClick(s.id, e)}
              />
            );
          return null;
        })}

        <Transformer
          ref={trRef}
          rotateEnabled
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
            "bottom-right",
            "middle-left",
            "middle-right",
            "top-center",
            "bottom-center",
          ]}
          padding={4}
          anchorSize={8}
          anchorCornerRadius={1}
          rotateAnchorOffset={20}
          anchorStrokeWidth={1}
          borderStrokeWidth={1}
          borderStroke={"#2b7fff"}
          anchorStroke={"#2b7fff"}
          ignoreStroke
        />
      </Layer>
    </Stage>
  );
}
