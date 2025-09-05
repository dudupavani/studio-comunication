// src/components/design-editor/InsertedImageNode.tsx
"use client";
import { Group, Image as KonvaImage } from "react-konva";
import type Konva from "konva";
import React, { useEffect, useRef } from "react";

export type InsertedImageLike = {
  id: string;
  url: string;
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
};

type Props = {
  data: InsertedImageLike;
  selected: boolean;
  registerRef?: (id: string, node: Konva.Group | null) => void;
  onSelect: (id: string, multi?: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onTransform: (id: string, patch: Partial<InsertedImageLike>) => void;
};

export default function InsertedImageNode({
  data,
  selected,
  registerRef,
  onSelect,
  onMove,
  onTransform,
}: Props) {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    registerRef?.(data.id, groupRef.current);
    return () => registerRef?.(data.id, null);
  }, [data.id, registerRef]);

  const handleMouseDown = (ev: any) => {
    ev.cancelBubble = true; // <- evita que o Stage limpe seleção / inicie marquee
    onSelect(data.id, !!ev.evt?.shiftKey);
  };
  const handleTouchStart = (ev: any) => {
    ev.cancelBubble = true;
    onSelect(data.id);
  };
  const handleClick = (ev: any) => {
    ev.cancelBubble = true; // <- redundância segura (navegadores/inputs diferentes)
    onSelect(data.id, !!ev.evt?.shiftKey);
  };

  const handleDragEnd = (e: any) => {
    onMove(data.id, e.target.x(), e.target.y()); // persiste posição
  };

  const handleTransformEnd = (e: any) => {
    const node = groupRef.current;
    if (!node) return;
    onTransform(data.id, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    });
  };

  return (
    <Group
      ref={groupRef}
      x={data.x}
      y={data.y}
      scaleX={data.scaleX ?? 1}
      scaleY={data.scaleY ?? 1}
      rotation={data.rotation ?? 0}
      draggable
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}>
      {/* sua <KonvaImage ...> aqui */}
      <KonvaImage image={/* ... */ undefined} listening />
    </Group>
  );
}
