// src/app/(app)/design-editor/editor/nodes/shapes/CircleNode.tsx
"use client";

import React from "react";
import { Circle } from "react-konva";
import Konva from "konva";
import { commitShapeTransform } from "../../transform-rules/shape";

type CircleModel = {
  type: "circle";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  draggable?: boolean;
};

type Props = {
  id: string;
  s: CircleModel;
  editing: boolean;
  onSelect: (id: string, isShift?: boolean) => void;
  onUpdate: (id: string, patch: Partial<CircleModel>) => void;
  onDragStart?: (id: string, node: Konva.Node, isShift?: boolean) => void;
  onDragMove?: (id: string, node: Konva.Node) => void;
  onDragEnd?: (id: string, node: Konva.Node) => void;
};

export default function CircleNode({
  id,
  s,
  editing,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const common = {
    onMouseDown: (evt: any) => {
      onSelect(id, !!evt?.evt?.shiftKey);
      evt.cancelBubble = true;
    },
    onTap: (evt: any) => {
      onSelect(id, false);
      evt.cancelBubble = true;
    },
    onDragStart: (evt: any) => {
      onDragStart?.(id, evt.target, !!evt?.evt?.shiftKey);
    },
    onDragMove: (evt: any) => {
      onDragMove?.(id, evt.target);
    },
    onDragEnd: (evt: any) => {
      onDragEnd?.(id, evt.target);
      const node = evt.target as Konva.Circle;
      onUpdate(id, {
        x: node.x() - s.width / 2,
        y: node.y() - s.height / 2,
      });
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

  const radius = Math.max(3, Math.min(s.width, s.height) / 2);

  return (
    <Circle
      {...common}
      x={s.x + s.width / 2}
      y={s.y + s.height / 2}
      radius={radius}
      onTransformEnd={(evt: any) => {
        const node = evt.target as Konva.Circle;
        onUpdate(id, commitShapeTransform(node));
      }}
    />
  );
}
