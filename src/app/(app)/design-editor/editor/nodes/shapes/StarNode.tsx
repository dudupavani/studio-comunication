// src/app/(app)/design-editor/editor/nodes/shapes/StarNode.tsx
"use client";

import React from "react";
import Konva from "konva";
import { Star } from "react-konva";
import { commitShapeTransform } from "../../transform-rules/shape";

type StarModel = {
  type: "star";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  draggable?: boolean;
  numPoints?: number;
};

type Props = {
  id: string;
  s: StarModel;
  editing: boolean;
  onSelect: (id: string, isShift?: boolean) => void;
  onUpdate: (id: string, patch: Partial<StarModel>) => void;
  onDragStart?: (id: string, node: Konva.Node, isShift?: boolean) => void;
  onDragMove?: (id: string, node: Konva.Node) => void;
  onDragEnd?: (id: string, node: Konva.Node) => void;
};

export default function StarNode({
  id,
  s,
  editing,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  // Nosso estado é top-left; Star no Konva é centrado.
  const cx = s.x + s.width / 2;
  const cy = s.y + s.height / 2;

  // Geometria base fixa (permite deformação via scaleX/scaleY)
  const BASE_W = 100;
  const BASE_H = 100;
  const outerRadius = 50; // BASE_W/2
  const innerRadius = outerRadius * 0.5;
  const scaleX = Math.max(0.01, s.width / BASE_W);
  const scaleY = Math.max(0.01, s.height / BASE_H);
  const numPoints = s.numPoints ?? 5;

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
      const node = evt.target as Konva.Star;
      onUpdate(id, { x: node.x() - s.width / 2, y: node.y() - s.height / 2 });
    },
    draggable: s.draggable && !editing,
    rotation: s.rotation,
    stroke: s.stroke,
    strokeWidth: s.strokeWidth ?? 0,
    fill: s.fill,
    id,
    name: s.type,

    opacity: (s as any).opacity ?? 1,
    shadowColor: (s as any).shadowColor,
    shadowBlur: (s as any).shadowBlur,
    shadowOffsetX: (s as any).shadowOffsetX,
    shadowOffsetY: (s as any).shadowOffsetY,
    shadowOpacity: (s as any).shadowOpacity,
  };

  return (
    <Star
      {...common}
      x={cx}
      y={cy}
      numPoints={numPoints}
      innerRadius={innerRadius}
      outerRadius={outerRadius}
      scaleX={scaleX}
      scaleY={scaleY}
      onTransformEnd={(evt: any) => {
        onUpdate(id, commitShapeTransform(evt.target as Konva.Star));
      }}
    />
  );
}
