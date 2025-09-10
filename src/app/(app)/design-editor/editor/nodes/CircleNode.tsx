"use client";

import React from "react";
import { Circle } from "react-konva";
import Konva from "konva";

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
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<CircleModel>) => void;
};

export default function CircleNode({
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
    draggable: s.draggable && !editing,
    rotation: s.rotation,
    stroke: s.stroke,
    strokeWidth: s.strokeWidth ?? 0,
    fill: s.fill,
    id,
    name: s.type,
  };

  const radius = Math.max(3, Math.min(s.width, s.height) / 2);

  return (
    <Circle
      {...common}
      x={s.x + s.width / 2}
      y={s.y + s.height / 2}
      radius={radius}
      onDragEnd={(evt: any) => {
        const node = evt.target as Konva.Circle;
        onUpdate(id, {
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
        onUpdate(id, {
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
