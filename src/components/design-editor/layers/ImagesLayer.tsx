// src/components/design-editor/layers/ImagesLayer.tsx
"use client";

import { Group } from "react-konva";
import type Konva from "konva";
import { useCallback, useMemo } from "react";
import InsertedImageNode, { InsertedImageLike } from "../InsertedImageNode";
import { useSelectionContext } from "@/components/design-editor/SelectionContext";

type Props = {
  images: InsertedImageLike[];

  // ✅ compat (serão removidos depois)
  selectedImageId?: string | null;
  selectedImageIds?: string[];

  // ✅ compat: se não vier do pai, usamos o contexto
  onSelectImage?: (id: string, multi?: boolean) => void;

  onMoveImage: (id: string, x: number, y: number) => void;
  onTransformImage: (id: string, patch: Partial<InsertedImageLike>) => void;

  // 🔧 corrigido: Konva.Node (não Group)
  imageRefs: React.MutableRefObject<Record<string, Konva.Node | null>>;
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
  const { selection, actions } = useSelectionContext();

  // 🔁 seleção vinda do contexto (preferencial)
  const idsFromContext = useMemo<string[]>(() => {
    if (selection.kind === "image") return selection.ids;
    if (selection.kind === "mixed") return selection.imageIds;
    return [];
  }, [selection]);

  // 🔁 normaliza: props legadas > contexto
  const effectiveIds = useMemo<string[]>(() => {
    if (selectedImageIds && selectedImageIds.length) return selectedImageIds;
    if (selectedImageId) return [selectedImageId];
    return idsFromContext;
  }, [selectedImageIds, selectedImageId, idsFromContext]);

  // ✅ ref idempotente e **sem setState**
  // 🔧 corrigido: parâmetro como Konva.Node | null
  const registerRef = useCallback(
    (id: string, node: Konva.Node | null) => {
      const prev = imageRefs.current[id] ?? null;
      if (prev === node) return; // nada mudou
      imageRefs.current[id] = node;
      try {
        node?.id?.(id); // garante id único no Stage (ajuda o Manager a resolver via stage.findOne)
      } catch {
        /* noop */
      }
    },
    [imageRefs]
  );

  // ✅ seleção via contexto (fallback se pai não fornecer handler)
  const handleSelect = useCallback(
    (id: string, multi?: boolean) => {
      if (onSelectImage) {
        onSelectImage(id, multi);
        return;
      }
      if (!id) return;
      if (multi) actions.toggle("image", id);
      else actions.select("image", id);
    },
    [onSelectImage, actions]
  );

  // ⚠️ Este componente NÃO cria <Layer>. Deve ser renderizado dentro da mesma <Layer>
  // que contém shapes e textos (ex.: <Layer name="UnifiedLayer"> no Canvas).

  return (
    <Group name="ImagesGroup" listening>
      {images.map((img) => (
        <InsertedImageNode
          key={img.id}
          data={img}
          selected={effectiveIds.includes(img.id)}
          onSelect={handleSelect}
          onMove={onMoveImage}
          onTransform={onTransformImage}
          registerRef={registerRef}
        />
      ))}
      {/* Transformer centralizado no Canvas via TransformerManager */}
    </Group>
  );
}
