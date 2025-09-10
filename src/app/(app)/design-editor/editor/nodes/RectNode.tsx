"use client";

import React from "react";
import { Rect } from "react-konva";
import Konva from "konva";

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
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<RectModel>) => void;
};

export default function RectNode({
  id,
  s,
  editing,
  onSelect,
  onUpdate,
}: Props) {
  const common = {
    onMouseDown: (evt: any) => {
      onSelect(id);
      evt.cancelBubble = true;
    },
    onTap: (evt: any) => {
      onSelect(id);
      evt.cancelBubble = true;
    },
    onDragEnd: (evt: any) => {
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
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        const newW = Math.max(5, Math.round(node.width() * scaleX));
        const newH = Math.max(5, Math.round(node.height() * scaleY));
        node.scaleX(1);
        node.scaleY(1);
        onUpdate(id, {
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
