// src/app/(app)/design-editor/editor/nodes/shapes/ImageNode.tsx
"use client";

import React from "react";
import Konva from "konva";
import { Image as KImage } from "react-konva";
import { commitShapeTransform } from "../../transform-rules/shape";

type ImageModel = {
  type: "image";
  x: number;
  y: number;
  width: number; // usamos width/height do estado (top-left), igual Rect
  height: number;
  rotation?: number;
  draggable?: boolean;
  src: string; // URL da imagem (Supabase signed URL)
};

type Props = {
  id: string;
  s: ImageModel;
  editing: boolean;
  onSelect: (id: string, isShift?: boolean) => void;
  onUpdate: (id: string, patch: Partial<ImageModel>) => void;
  onDragStart?: (id: string, node: Konva.Node, isShift?: boolean) => void;
  onDragMove?: (id: string, node: Konva.Node) => void;
  onDragEnd?: (id: string, node: Konva.Node) => void;
};

export default function ImageNode({
  id,
  s,
  editing,
  onSelect,
  onUpdate,
  onDragStart,
  onDragMove,
  onDragEnd,
}: Props) {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);

  // carrega a imagem da URL assinada do Supabase
  React.useEffect(() => {
    if (!s.src) {
      setImg(null);
      return;
    }
    const el = new window.Image();
    // importante para evitar taint em canvas quando a URL é externa
    el.crossOrigin = "anonymous";
    el.src = s.src;

    const handleLoad = () => setImg(el);
    const handleError = () => setImg(null);

    el.addEventListener("load", handleLoad);
    el.addEventListener("error", handleError);
    return () => {
      el.removeEventListener("load", handleLoad);
      el.removeEventListener("error", handleError);
    };
  }, [s.src]);

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
      const node = evt.target as Konva.Node & {
        x: () => number;
        y: () => number;
      };
      // imagem usa top-left igual Rect → salva direto
      onUpdate(id, { x: node.x(), y: node.y() });
    },
    draggable: s.draggable && !editing,
    rotation: s.rotation,
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
    <KImage
      {...common}
      x={s.x}
      y={s.y}
      width={s.width}
      height={s.height}
      image={img ?? undefined}
      // quando terminar o transform, converte scale -> width/height e zera scale
      onTransformEnd={(evt: any) => {
        const node = evt.target as Konva.Image;
        onUpdate(id, commitShapeTransform(node));
      }}
    />
  );
}
