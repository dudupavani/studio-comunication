// src/components/design-editor/InsertedImageNode.tsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Group, Image as KonvaImage } from "react-konva";
import type Konva from "konva";

// ⚠️ Mantém o tipo existente no projeto
export type InsertedImageLike = {
  id: string;
  url: string;
  path?: string;
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
  opacity?: number;
};

type Props = {
  data: InsertedImageLike;
  selected: boolean;
  onSelect: (id: string, multi?: boolean) => void;
  onMove: (id: string, x: number, y: number) => void;
  onTransform: (id: string, patch: Partial<InsertedImageLike>) => void;
  registerRef: (id: string, node: Konva.Group | null) => void;
};

const TRANSPARENT_1PX =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

export default function InsertedImageNode({
  data,
  selected, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSelect,
  onMove,
  onTransform,
  registerRef,
}: Props) {
  const groupRef = useRef<Konva.Group>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  // registra / remove ref no mapa compartilhado
  useEffect(() => {
    registerRef(data.id, groupRef.current);
    return () => registerRef(data.id, null);
  }, [data.id, registerRef]);

  // carrega a imagem real (com fallback 1x1 para satisfazer TS/konva)
  useEffect(() => {
    let cancelled = false;

    const load = () => {
      const el = new window.Image();
      el.crossOrigin = "anonymous";
      el.onload = () => {
        if (!cancelled) setImgEl(el);
      };
      el.onerror = () => {
        if (!cancelled) {
          const fallback = new window.Image();
          fallback.src = TRANSPARENT_1PX;
          setImgEl(fallback);
        }
      };
      el.src = data.url;
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [data.url]);

  // garante que SEMPRE passamos alguma imagem ao <KonvaImage>
  const imageToUse: HTMLImageElement = (() => {
    if (imgEl) return imgEl;
    const ph = new window.Image();
    ph.src = TRANSPARENT_1PX;
    return ph;
  })();

  const handleClick = useCallback(
    (evt: any) => {
      const multi = !!(
        evt?.evt?.shiftKey ||
        evt?.evt?.metaKey ||
        evt?.evt?.ctrlKey
      );
      onSelect(data.id, multi);
      // evita "perder" o click para o Stage
      evt.cancelBubble = true;
    },
    [data.id, onSelect]
  );

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target as Konva.Group;
      onMove(data.id, node.x(), node.y());
    },
    [data.id, onMove]
  );

  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    onTransform(data.id, {
      x: node.x(),
      y: node.y(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
      rotation: node.rotation(),
    });
  }, [data.id, onTransform]);

  const opacity =
    typeof (data as any).opacity === "number" ? (data as any).opacity : 1;

  return (
    <Group
      ref={groupRef}
      x={data.x}
      y={data.y}
      scaleX={data.scaleX ?? 1}
      scaleY={data.scaleY ?? 1}
      rotation={data.rotation ?? 0}
      draggable
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      onMouseDown={handleClick}
      onTap={handleClick}
      listening>
      <KonvaImage image={imageToUse} opacity={opacity} listening />
    </Group>
  );
}
