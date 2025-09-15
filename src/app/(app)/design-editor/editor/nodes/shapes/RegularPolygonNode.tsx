// src/app/(app)/design-editor/editor/nodes/shapes/RegularPolygonNode.tsx
"use client";

import React from "react";
import Konva from "konva";
import { RegularPolygon } from "react-konva";
import { commitShapeTransform } from "../../transform-rules/shape";

type PolygonModel = {
  type: "polygon";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  draggable?: boolean;
  sides?: number;
};

type Props = {
  id: string;
  s: PolygonModel;
  editing: boolean;
  onSelect: (id: string, isShift?: boolean) => void;
  onUpdate: (id: string, patch: Partial<PolygonModel>) => void;
  onDragStart?: (id: string, node: Konva.Node, isShift?: boolean) => void;
  onDragMove?: (id: string, node: Konva.Node) => void;
  onDragEnd?: (id: string, node: Konva.Node) => void;
};

export default function RegularPolygonNode({
  id,
  s,
  editing,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  // Estado top-left; RegularPolygon no Konva é centrado.
  const cx = s.x + s.width / 2;
  const cy = s.y + s.height / 2;

  const BASE_W = 100;
  const BASE_H = 100;
  const radius = 50; // BASE_W/2
  const scaleX = Math.max(0.01, s.width / BASE_W);
  const scaleY = Math.max(0.01, s.height / BASE_H);
  const sides = Math.max(3, s.sides ?? 6);

  const common = {
    onMouseDown: (evt: any) => {
      onSelect(id, !!evt?.evt?.shiftKey);
      evt.cancelBubble = true;
    },
    onTap: (evt: any) => {
      onSelect(id, false);
      evt.cancelBubble = true;
    },
    onDragStart: (evt: any) =>
      onDragStart?.(id, evt.target, !!evt?.evt?.shiftKey),
    onDragMove: (evt: any) => onDragMove?.(id, evt.target),
    onDragEnd: (evt: any) => {
      onDragEnd?.(id, evt.target);
      const node = evt.target as Konva.RegularPolygon;
      onUpdate(id, { x: node.x() - s.width / 2, y: node.y() - s.height / 2 });
    },
    draggable: s.draggable && !editing,
    rotation: s.rotation,
    stroke: s.stroke,
    strokeWidth: s.strokeWidth ?? 0,
    fill: s.fill,
    id,
    name: s.type,
  };

  return (
    <RegularPolygon
      {...common}
      x={cx}
      y={cy}
      sides={sides}
      radius={radius}
      scaleX={scaleX}
      scaleY={scaleY}
      onTransformEnd={(evt: any) => {
        onUpdate(id, commitShapeTransform(evt.target as Konva.RegularPolygon));
      }}
    />
  );
}
