// src/components/design-editor/ShapesLayer.tsx
"use client";

import React from "react";
import {
  Rect,
  Text as KonvaText,
  Circle as KonvaCircle,
  RegularPolygon as KonvaRegularPolygon,
  Line as KonvaLine,
  Star as KonvaStar,
} from "react-konva";
import type Konva from "konva";
import type {
  AnyShape,
  ShapeRect,
  ShapeCircle,
  ShapeTriangle,
  ShapeLine,
  ShapeStar,
  ShapeText,
} from "@/lib/design-editor/types";

type Props = {
  shapes: AnyShape[];
  selectedId: string | null; // reservado p/ estilos futuros
  onSelectShape: (id: string) => void;
  /** Registro de refs dos nós (compatível com Canvas.tsx) */
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
};

export default function ShapesLayer({
  shapes,
  selectedId, // mantido por compatibilidade futura
  onSelectShape,
  shapeRefs,
}: Props) {
  return (
    <>
      {shapes.map((s) => {
        const setRef = (node: Konva.Node | null) => {
          shapeRefs.current[s.id] = node;
        };

        switch (s.type) {
          case "rect": {
            const rect = s as ShapeRect;
            return (
              <Rect
                key={s.id}
                ref={setRef as any}
                x={s.x}
                y={s.y}
                rotation={s.rotation}
                visible={!s.isHidden}
                listening={!s.isLocked}
                draggable={!s.isLocked}
                opacity={s.opacity}
                shadowBlur={s.shadowBlur}
                shadowOffsetX={s.shadowOffsetX}
                shadowOffsetY={s.shadowOffsetY}
                onClick={() => onSelectShape(s.id)}
                onTap={() => onSelectShape(s.id)}
                width={rect.width}
                height={rect.height}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
              />
            );
          }
          case "circle": {
            const c = s as ShapeCircle;
            return (
              <KonvaCircle
                key={s.id}
                ref={setRef as any}
                x={s.x}
                y={s.y}
                rotation={s.rotation}
                visible={!s.isHidden}
                listening={!s.isLocked}
                draggable={!s.isLocked}
                opacity={s.opacity}
                shadowBlur={s.shadowBlur}
                shadowOffsetX={s.shadowOffsetX}
                shadowOffsetY={s.shadowOffsetY}
                onClick={() => onSelectShape(s.id)}
                onTap={() => onSelectShape(s.id)}
                radius={c.radius}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
              />
            );
          }
          case "triangle": {
            const t = s as ShapeTriangle;
            return (
              <KonvaRegularPolygon
                key={s.id}
                ref={setRef as any}
                x={s.x}
                y={s.y}
                rotation={s.rotation}
                visible={!s.isHidden}
                listening={!s.isLocked}
                draggable={!s.isLocked}
                opacity={s.opacity}
                shadowBlur={s.shadowBlur}
                shadowOffsetX={s.shadowOffsetX}
                shadowOffsetY={s.shadowOffsetY}
                onClick={() => onSelectShape(s.id)}
                onTap={() => onSelectShape(s.id)}
                sides={3}
                radius={t.radius}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
              />
            );
          }
          case "line": {
            const l = s as ShapeLine;
            return (
              <KonvaLine
                key={s.id}
                ref={setRef as any}
                x={s.x}
                y={s.y}
                rotation={s.rotation}
                visible={!s.isHidden}
                listening={!s.isLocked}
                draggable={!s.isLocked}
                opacity={s.opacity}
                shadowBlur={s.shadowBlur}
                shadowOffsetX={s.shadowOffsetX}
                shadowOffsetY={s.shadowOffsetY}
                onClick={() => onSelectShape(s.id)}
                onTap={() => onSelectShape(s.id)}
                points={l.points}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
                lineCap={l.lineCap}
              />
            );
          }
          case "star": {
            const st = s as ShapeStar;
            return (
              <KonvaStar
                key={s.id}
                ref={setRef as any}
                x={s.x}
                y={s.y}
                rotation={s.rotation}
                visible={!s.isHidden}
                listening={!s.isLocked}
                draggable={!s.isLocked}
                opacity={s.opacity}
                shadowBlur={s.shadowBlur}
                shadowOffsetX={s.shadowOffsetX}
                shadowOffsetY={s.shadowOffsetY}
                onClick={() => onSelectShape(s.id)}
                onTap={() => onSelectShape(s.id)}
                numPoints={st.numPoints}
                innerRadius={st.innerRadius}
                outerRadius={st.outerRadius}
                fill={s.fill}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
              />
            );
          }
          case "text": {
            const tx = s as ShapeText;
            return (
              <KonvaText
                key={s.id}
                ref={setRef as any}
                x={s.x}
                y={s.y}
                rotation={s.rotation}
                visible={!s.isHidden}
                listening={!s.isLocked}
                draggable={!s.isLocked}
                opacity={s.opacity}
                shadowBlur={s.shadowBlur}
                shadowOffsetX={s.shadowOffsetX}
                shadowOffsetY={s.shadowOffsetY}
                onClick={() => onSelectShape(s.id)}
                onTap={() => onSelectShape(s.id)}
                text={tx.text}
                fontFamily={tx.fontFamily}
                fontSize={tx.fontSize}
                fontStyle={tx.fontStyle}
                align={tx.align}
                lineHeight={tx.lineHeight}
                letterSpacing={tx.letterSpacing}
                width={tx.width}
                height={tx.height}
                padding={tx.padding ?? 0}
                fill={s.fill}
              />
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}
