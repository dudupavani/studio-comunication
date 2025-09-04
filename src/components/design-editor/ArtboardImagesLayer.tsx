// src/components/design-editor/ArtboardImagesLayer.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Layer,
  Group,
  Image as KonvaImage,
  Rect,
  Text as KText,
} from "react-konva";
import useImage from "use-image";

export type InsertImageDetail = { url: string; path: string };

type InsertedImage = {
  id: string;
  url: string; // signed URL
  path: string; // storage path
  x: number; // coord em espaço local (artboard)
  y: number;
};

export default function ArtboardImagesLayer({
  artboard,
  maxInitialDim = 512,
}: {
  artboard: { width: number; height: number };
  /** Limite de tamanho inicial da imagem para não ocupar a tela inteira */
  maxInitialDim?: number;
}) {
  const layerRef = useRef<any>(null);
  const [images, setImages] = useState<InsertedImage[]>([]);

  // Centro da artboard em coordenadas LOCAIS é simplesmente metade (independe do zoom/offset do Stage)
  const artboardCenter = () => ({
    x: artboard.width / 2,
    y: artboard.height / 2,
  });

  const handleInsert = useCallback(
    (detail: InsertImageDetail) => {
      const id = `img-${crypto.randomUUID().slice(0, 8)}`;
      const { x, y } = artboardCenter();
      setImages((prev) => [
        ...prev,
        { id, url: detail.url, path: detail.path, x, y },
      ]);
    },
    [artboard.width, artboard.height]
  );

  useEffect(() => {
    const onInsertImageEv = (ev: Event) => {
      const e = ev as CustomEvent<InsertImageDetail>;
      if (e?.detail?.url) handleInsert(e.detail);
    };
    window.addEventListener(
      "design-editor:insert-image",
      onInsertImageEv as EventListener
    );
    return () =>
      window.removeEventListener(
        "design-editor:insert-image",
        onInsertImageEv as EventListener
      );
  }, [handleInsert]);

  return (
    <Layer ref={layerRef} name="ImagesLayer">
      {images.map((img) => (
        <InsertedImageNode
          key={img.id}
          data={img}
          maxInitialDim={maxInitialDim}
          onMove={(id, x, y) =>
            setImages((prev) =>
              prev.map((it) => (it.id === id ? { ...it, x, y } : it))
            )
          }
          onRemove={(id) =>
            setImages((prev) => prev.filter((it) => it.id !== id))
          }
        />
      ))}
    </Layer>
  );
}

function InsertedImageNode({
  data,
  maxInitialDim,
  onMove,
  onRemove,
}: {
  data: InsertedImage;
  maxInitialDim: number;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
}) {
  const [image] = useImage(data.url, "anonymous");

  // Escala inicial (limita a imagem para não “explodir” a artboard)
  let scale = 1;
  if (image && image.width && image.height) {
    scale = Math.min(
      maxInitialDim / image.width,
      maxInitialDim / image.height,
      1
    );
  }

  // Botão de remover
  const BTN = { w: 18, h: 18, pad: 4 };

  return (
    <Group
      x={data.x}
      y={data.y}
      draggable
      onDragEnd={(e) => onMove(data.id, e.target.x(), e.target.y())}>
      <KonvaImage
        image={image || undefined}
        x={0}
        y={0}
        scaleX={scale}
        scaleY={scale}
      />

      {/* Botão remover no canto superior esquerdo */}
      <Group
        x={-BTN.pad}
        y={-BTN.pad}
        onMouseDown={(e) => {
          e.cancelBubble = true; // evita iniciar drag
        }}
        onClick={(e) => {
          e.cancelBubble = true;
          onRemove(data.id);
        }}>
        <Rect
          width={BTN.w}
          height={BTN.h}
          fill="rgba(239,68,68,0.95)" // red-500
          cornerRadius={4}
          shadowBlur={2}
          shadowOpacity={0.3}
        />
        <KText
          text="×"
          x={0}
          y={-1}
          width={BTN.w}
          height={BTN.h}
          align="center"
          verticalAlign="middle"
          fontSize={14}
          fill="#fff"
        />
      </Group>
    </Group>
  );
}
