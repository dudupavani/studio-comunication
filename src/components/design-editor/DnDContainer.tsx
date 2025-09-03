// src/components/design-editor/DnDContainer.tsx
"use client";

import { useEffect } from "react";
import type Konva from "konva";

/** Mesmo contrato de tipos usado no Canvas */
type ShapeKind = "rect" | "text" | "circle" | "triangle" | "line" | "star";

/** MIME usado no drag & drop (deve bater com o EditorShell) */
const DND_MIME = "application/x-design-editor";

type Props = {
  stageRef: React.RefObject<Konva.Stage>;
  onDropShape: (type: ShapeKind, x: number, y: number) => void;
};

/** Normaliza strings vindas do DnD para nosso discriminated union */
function normalizeType(t: string): ShapeKind {
  let v = (t || "").toLowerCase();
  if (v === "polygon" || v === "tri") v = "triangle";
  if (!["rect", "text", "circle", "triangle", "line", "star"].includes(v)) {
    v = "text";
  }
  return v as ShapeKind;
}

function parseDropData(dt: DataTransfer | null): { type: ShapeKind } {
  if (!dt) return { type: "text" };
  const raw =
    dt.getData(DND_MIME) ||
    dt.getData("application/json") ||
    dt.getData("text/plain") ||
    "";
  let t = "";
  try {
    const obj = raw ? JSON.parse(raw) : {};
    t = (obj?.type || obj?.shape || "").toString().toLowerCase();
  } catch {
    t = (raw || "").toString().toLowerCase();
  }
  return { type: normalizeType(t) };
}

/**
 * Anexa listeners de dragover/drop ao container do Stage do Konva.
 * Isola a lógica de DnD fora do Canvas.
 */
export default function DnDContainer({ stageRef, onDropShape }: Props) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const container = stage.container();

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const { type } = parseDropData(e.dataTransfer || null);

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // garante limites do Stage
      if (x < 0 || y < 0 || x > stage.width() || y > stage.height()) return;

      onDropShape(type, x, y);
    };

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);

    return () => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
    };
  }, [stageRef, onDropShape]);

  return null;
}
