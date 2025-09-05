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
} from "@/components/design-editor/types/shapes";

type Props = {
  shapes: AnyShape[];
  /** mantido para compatibilidade/estilização futura */
  selectedId: string | null;
  /** seleção (Shift para múltipla quando multi = true) */
  onSelectShape: (id: string, multi?: boolean) => void;
  /** persiste posição ao fim do drag */
  onMoveShape: (id: string, x: number, y: number) => void;
  /** refs dos nós konva, compartilhados com o Canvas */
  shapeRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
};

export default function ShapesLayer({
  shapes,
  selectedId, // não utilizado diretamente; reservado
  onSelectShape,
  onMoveShape,
  shapeRefs,
}: Props) {
  return (
    <>
      {shapes.map((s) => {
        const setRef = (node: Konva.Node | null) => {
          shapeRefs.current[s.id] = node;
        };

        // Handlers centralizados (parametrizados por shape id)
        const handleMouseDown =
          (id: string) => (ev: Konva.KonvaEventObject<MouseEvent>) => {
            // evita que o Stage trate como clique em área vazia (marquee/clear)
            ev.cancelBubble = true;
            onSelectShape(id, !!ev.evt?.shiftKey);
          };

        const handleClick =
          (id: string) => (ev: Konva.KonvaEventObject<MouseEvent>) => {
            // redundante por segurança em dispositivos/fluxos que não disparam mousedown
            ev.cancelBubble = true;
            onSelectShape(id, !!ev.evt?.shiftKey);
          };

        const handleTap =
          (id: string) => (ev: Konva.KonvaEventObject<Event>) => {
            ev.cancelBubble = true;
            onSelectShape(id);
          };

        const handleDragStart =
          () => (ev: Konva.KonvaEventObject<DragEvent>) => {
            // não deixa o Stage interpretar como clique vazio
            ev.cancelBubble = true;
          };

        const handleDragEnd =
          (id: string) => (ev: Konva.KonvaEventObject<DragEvent>) => {
            onMoveShape(
              id,
              (ev.target as Konva.Node).x(),
              (ev.target as Konva.Node).y()
            );
          };

        const common = {
          key: s.id,
          ref: setRef as any,
          x: s.x,
          y: s.y,
          rotation: s.rotation,
          visible: !s.isHidden,
          listening: !s.isLocked,
          draggable: !s.isLocked,
          opacity: s.opacity,
          shadowBlur: s.shadowBlur,
          shadowOffsetX: s.shadowOffsetX,
          shadowOffsetY: s.shadowOffsetY,
          onMouseDown: handleMouseDown(s.id),
          onClick: handleClick(s.id),
          onTap: handleTap(s.id),
          onDragStart: handleDragStart(),
          onDragEnd: handleDragEnd(s.id),
        };

        switch (s.type) {
          case "rect": {
            const r = s as ShapeRect;
            return (
              <Rect
                {...common}
                width={r.width}
                height={r.height}
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
                {...common}
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
                {...common}
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
                {...common}
                points={l.points}
                stroke={s.stroke}
                strokeWidth={s.strokeWidth}
                lineCap={l.lineCap}
                // facilita o clique em linhas finas
                hitStrokeWidth={Math.max((s.strokeWidth ?? 0) as number, 10)}
              />
            );
          }
          case "star": {
            const st = s as ShapeStar;
            return (
              <KonvaStar
                {...common}
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
                {...common}
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
