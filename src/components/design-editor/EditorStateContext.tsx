// src/components/design-editor/EditorStateContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
} from "react";
import type { AnyShape } from "@/components/design-editor/types/shapes";
import type { InsertedImageLike as InsertedImage } from "@/components/design-editor/InsertedImageNode";

/** Ordem de empilhamento unificada do editor (base -> topo) */
export type StackItem = { kind: "shape" | "image"; id: string };

type EditorState = {
  shapes: AnyShape[];
  images: InsertedImage[];
  stack: StackItem[];

  // Selectors
  getShapeById: (id: string) => AnyShape | null;

  // Actions
  addShape: (shape: AnyShape, addToTop?: boolean) => void;
  updateShape: (id: string, patch: Partial<AnyShape>) => void;
  removeShape: (id: string) => void;

  addImage: (img: InsertedImage, addToTop?: boolean) => void;
  updateImage: (id: string, patch: Partial<InsertedImage>) => void;
  removeImage: (id: string) => void;

  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
};

const EditorStateContext = createContext<EditorState | null>(null);

export function EditorStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [images, setImages] = useState<InsertedImage[]>([]);
  const [stack, setStack] = useState<StackItem[]>([]);

  const getShapeById = useCallback(
    (id: string) => shapes.find((s) => s.id === id) ?? null,
    [shapes]
  );

  const addShape = useCallback((shape: AnyShape, addToTop = true) => {
    setShapes((prev) => [...prev, shape]);
    setStack((prev) =>
      addToTop
        ? [...prev, { kind: "shape", id: shape.id }]
        : [{ kind: "shape", id: shape.id }, ...prev]
    );
  }, []);

  const updateShape = useCallback((id: string, patch: Partial<AnyShape>) => {
    setShapes((prev) =>
      prev.map((s) =>
        s.id === id ? ({ ...s, ...(patch as any) } as AnyShape) : s
      )
    );
  }, []);

  const removeShape = useCallback((id: string) => {
    setShapes((prev) => prev.filter((s) => s.id !== id));
    setStack((prev) =>
      prev.filter((k) => !(k.kind === "shape" && k.id === id))
    );
  }, []);

  const addImage = useCallback((img: InsertedImage, addToTop = true) => {
    setImages((prev) => [...prev, img]);
    setStack((prev) =>
      addToTop
        ? [...prev, { kind: "image", id: img.id }]
        : [{ kind: "image", id: img.id }, ...prev]
    );
  }, []);

  const updateImage = useCallback(
    (id: string, patch: Partial<InsertedImage>) => {
      setImages((prev) =>
        prev.map((i) =>
          i.id === id ? ({ ...i, ...(patch as any) } as InsertedImage) : i
        )
      );
    },
    []
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((i) => i.id !== id));
    setStack((prev) =>
      prev.filter((k) => !(k.kind === "image" && k.id === id))
    );
  }, []);

  const bringForward = useCallback((id: string) => {
    setStack((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy;
    });
  }, []);

  const sendBackward = useCallback((id: string) => {
    setStack((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  }, []);

  const value = useMemo<EditorState>(
    () => ({
      shapes,
      images,
      stack,
      getShapeById,
      addShape,
      updateShape,
      removeShape,
      addImage,
      updateImage,
      removeImage,
      bringForward,
      sendBackward,
    }),
    [
      shapes,
      images,
      stack,
      getShapeById,
      addShape,
      updateShape,
      removeShape,
      addImage,
      updateImage,
      removeImage,
      bringForward,
      sendBackward,
    ]
  );

  return (
    <EditorStateContext.Provider value={value}>
      {children}
    </EditorStateContext.Provider>
  );
}

export function useEditorState() {
  const ctx = useContext(EditorStateContext);
  if (!ctx)
    throw new Error(
      "useEditorState deve ser usado dentro de <EditorStateProvider />"
    );
  return ctx;
}
