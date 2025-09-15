// src/app/(app)/design-editor/editor/nodes/shapes/RectNode.tsx
"use client";

import React from "react";
import { Rect } from "react-konva";
import Konva from "konva";
import { commitShapeTransform } from "../../transform-rules/shape";

type RectModel = {
  type: "rect";
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
  s: RectModel;
  editing: boolean;
  onSelect: (id: string, isShift?: boolean) => void;
  onUpdate: (id: string, patch: Partial<RectModel>) => void;
  onDragStart?: (id: string, node: Konva.Node, isShift?: boolean) => void;
  onDragMove?: (id: string, node: Konva.Node) => void;
  onDragEnd?: (id: string, node: Konva.Node) => void;
};

export default function RectNode({
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
      const node = evt.target as Konva.Node & {
        x: () => number;
        y: () => number;
      };
      onUpdate(id, { x: node.x(), y: node.y() });
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
    <Rect
      {...common}
      x={s.x}
      y={s.y}
      width={s.width}
      height={s.height}
      onTransformEnd={(evt: any) => {
        const node = evt.target as Konva.Rect;
        onUpdate(id, commitShapeTransform(node));
      }}
    />
  );
}
