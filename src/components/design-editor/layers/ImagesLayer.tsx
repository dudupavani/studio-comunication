// src/components/design-editor/layers/ImagesLayer.tsx
"use client";

import { Layer } from "react-konva";
import type Konva from "konva";
import { useCallback, useMemo } from "react";
import InsertedImageNode, { InsertedImageLike } from "../InsertedImageNode";
import SelectionTransformer from "../SelectionTransformer";

type Props = {
  images: InsertedImageLike[];

  // ✅ compat + novo
  selectedImageId?: string | null; // legado (opcional)
  selectedImageIds?: string[]; // novo (preferível)

  onSelectImage: (id: string, multi?: boolean) => void;
  onMoveImage: (id: string, x: number, y: number) => void;
  onTransformImage: (id: string, patch: Partial<InsertedImageLike>) => void;

  imageRefs: React.MutableRefObject<Record<string, Konva.Group | null>>;
};

export default function ImagesLayer({
  images,
  selectedImageId,
  selectedImageIds,
  onSelectImage,
  onMoveImage,
  onTransformImage,
  imageRefs,
}: Props) {
  // 🔒 boundBox simples para evitar imagem sumir ao redimensionar
  const MIN_IMG_SIZE = 8;
  const imageBoundBox = useCallback((oldBox: any, newBox: any) => {
    const w = Math.abs(newBox.width);
    const h = Math.abs(newBox.height);
    if (w < MIN_IMG_SIZE || h < MIN_IMG_SIZE) return oldBox;
    return newBox;
  }, []);

  // ✅ ref idempotente e **sem setState**
  const registerRef = useCallback(
    (id: string, node: Konva.Group | null) => {
      const prev = imageRefs.current[id] ?? null;
      if (prev === node) return; // nada mudou
      imageRefs.current[id] = node;
    },
    [imageRefs]
  );

  // ✅ normaliza seleção (legado + novo)
  const ids: string[] = useMemo(() => {
    if (selectedImageIds && selectedImageIds.length) return selectedImageIds;
    return selectedImageId ? [selectedImageId] : [];
  }, [selectedImageIds, selectedImageId]);

  // ✅ memo dos nós selecionados (sem estados auxiliares)
  const selectedNodes = useMemo(() => {
    return ids
      .map((id) => imageRefs.current[id] ?? null)
      .filter(Boolean) as Konva.Node[];
  }, [ids, imageRefs]);

  return (
    <Layer name="ImagesLayer">
      {images.map((img) => (
        <InsertedImageNode
          key={img.id}
          data={img}
          selected={ids.includes(img.id)}
          onSelect={onSelectImage}
          onMove={onMoveImage}
          onTransform={onTransformImage}
          registerRef={registerRef}
        />
      ))}

      {selectedNodes.length > 0 && (
        <SelectionTransformer
          selectedNodes={selectedNodes}
          getOptionsForSelection={() => ({
            keepRatio: true,
            rotateEnabled: true,
            enabledAnchors: [
              "top-left",
              "top-right",
              "bottom-left",
              "bottom-right",
              "middle-left",
              "middle-right",
              "top-center",
              "bottom-center",
            ],
            boundBoxFunc: imageBoundBox,
          })}
        />
      )}
    </Layer>
  );
}