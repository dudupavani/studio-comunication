// src/components/design-editor/Canvas.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import ShapesLayer from "./ShapesLayer";
import EventBridge from "./EventBridge";
import TransformerManager from "./TransformerManager";
import HintOverlay from "./HintOverlay";
import DnDContainer from "./DnDContainer";

// 🔹 novos (já existentes no seu projeto)
import { useSelectionSync } from "@/components/design-editor/hooks/useSelectionSync";
import {
  isKonvaTextNode,
  applyTextPatchToNode,
} from "@/components/design-editor/utils/konvaCache";

// 🔹 novos (artboard)
import { useArtboard } from "@/hooks/design-editor/use-artboard";
import ArtboardLayer from "@/components/design-editor/ArtboardLayer";

// ========= Constantes =========
const DEFAULTS = {
  fill: "#000000",
  stroke: "#000000",
  strokeWidth: 0,
  opacity: 1,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  line: {
    stroke: "#000000",
    strokeWidth: 2,
    opacity: 1,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
  },
  text: {
    fill: "#000000",
    opacity: 1,
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    text: "Seu texto aqui",
    fontFamily: "Arial",
    fontSize: 28,
    fontStyle: "bold" as "normal" | "bold" | "italic" | "bold italic",
    align: "left" as "left" | "center" | "right" | "justify",
    lineHeight: 1.2,
    letterSpacing: 0,
    width: 240,
    height: 40,
    padding: 0,
  },
} as const;

// Padding visual ao redor da artboard dentro do Stage
const ARTBOARD_PAD = 200;

// ========= Tipos =========
type ShapeKind = "rect" | "text" | "circle" | "triangle" | "line" | "star";

type ShapeBase = {
  id: string;
  type: ShapeKind;
  x: number;
  y: number;
  rotation: number;
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;

  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

type ShapeRect = ShapeBase & {
  type: "rect";
  width: number;
  height: number;
};
type ShapeCircle = ShapeBase & { type: "circle"; radius: number };
type ShapeTriangle = ShapeBase & { type: "triangle"; radius: number };
type ShapeLine = ShapeBase & {
  type: "line";
  points: number[];
  lineCap?: "butt" | "round" | "square";
};
type ShapeStar = ShapeBase & {
  type: "star";
  numPoints: number;
  innerRadius: number;
  outerRadius: number;
};
type ShapeText = ShapeBase & {
  type: "text";
  text: string;
  fontFamily?: string;
  fontSize: number;
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  width?: number;
  height?: number;
  padding?: number;
};

type AnyShape =
  | ShapeRect
  | ShapeCircle
  | ShapeTriangle
  | ShapeLine
  | ShapeStar
  | ShapeText;

function isShapeText(s: AnyShape): s is ShapeText {
  return s.type === "text";
}

// ========= Helper Normalização (usado por EventBridge.create)
function normalizeType(t: string): ShapeKind {
  let v = (t || "").toLowerCase();
  if (v === "polygon" || v === "tri") v = "triangle";
  if (!["rect", "text", "circle", "triangle", "line", "star"].includes(v)) {
    v = "text";
  }
  return v as ShapeKind;
}

export default function Canvas() {
  // ---------- refs ----------
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // 🔹 Tamanho do Stage (agora baseado no container + artboard)
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });

  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});

  // 🔹 Artboard (controlado pelo hook que escuta o evento de Templates)
  const { artboard } = useArtboard();

  // refs para evitar closures “stale”
  const shapesRef = useRef<AnyShape[]>(shapes);
  const selectedRef = useRef<string | null>(selectedId);
  useEffect(() => {
    shapesRef.current = shapes;
    selectedRef.current = selectedId;
  }, [shapes, selectedId]);

  // ---------- responsivo ----------
  // Ajusta o Stage para caber a artboard + padding, respeitando o espaço visível
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const compute = () => {
      const vw = Math.max(320, Math.floor(el.clientWidth));
      const vh = Math.max(360, Math.floor(el.clientHeight || 0));
      const minW = artboard.width + ARTBOARD_PAD * 2;
      const minH = artboard.height + ARTBOARD_PAD * 2;

      setStageSize({
        width: Math.max(vw, minW),
        height: Math.max(vh, minH),
      });
    };

    const ro = new ResizeObserver(compute);
    ro.observe(el);
    compute();

    return () => ro.disconnect();
  }, [artboard.width, artboard.height]);

  // ---------- emitir estado p/ camada lateral ----------
  useEffect(() => {
    if (typeof window === "undefined") return;
    const payload = {
      selectedId,
      shapes: shapes.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        isHidden: !!s.isHidden,
        isLocked: !!s.isLocked,
      })),
    };
    window.dispatchEvent(
      new CustomEvent("design-editor:state", { detail: payload })
    );
  }, [shapes, selectedId]);

  // ---------- sincroniza propriedades da seleção (hook) ----------
  useSelectionSync<AnyShape>({
    selectedId,
    shapes,
    defaults: DEFAULTS,
  });

  // ---------- add shape util ----------
  function addShapeAt(type: AnyShape["type"], x: number, y: number) {
    const rid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;
    let newShape: AnyShape;

    switch (type) {
      case "rect":
        newShape = {
          id: rid("rect"),
          type,
          name: "Retângulo",
          x: x - 70,
          y: y - 50,
          width: 140,
          height: 100,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          isHidden: false,
          isLocked: false,
        } as ShapeRect;
        break;
      case "circle":
        newShape = {
          id: rid("circle"),
          type,
          name: "Círculo",
          x,
          y,
          radius: 60,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          isHidden: false,
          isLocked: false,
        } as ShapeCircle;
        break;
      case "triangle":
        newShape = {
          id: rid("triangle"),
          type,
          name: "Triângulo",
          x,
          y,
          radius: 70,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          isHidden: false,
          isLocked: false,
        } as ShapeTriangle;
        break;
      case "line":
        newShape = {
          id: rid("line"),
          type,
          name: "Linha",
          x,
          y,
          points: [-70, 0, 70, 0],
          rotation: 0,
          stroke: DEFAULTS.line.stroke,
          strokeWidth: DEFAULTS.line.strokeWidth,
          opacity: DEFAULTS.line.opacity,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          lineCap: "round",
          isHidden: false,
          isLocked: false,
        } as ShapeLine;
        break;
      case "star":
        newShape = {
          id: rid("star"),
          type,
          name: "Estrela",
          x,
          y,
          numPoints: 5,
          innerRadius: 30,
          outerRadius: 70,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          isHidden: false,
          isLocked: false,
        } as ShapeStar;
        break;
      default:
        newShape = {
          id: rid("text"),
          type: "text",
          name: "Texto",
          x,
          y,
          rotation: 0,
          text: DEFAULTS.text.text,
          fontFamily: DEFAULTS.text.fontFamily,
          fontSize: DEFAULTS.text.fontSize,
          fontStyle: DEFAULTS.text.fontStyle,
          align: DEFAULTS.text.align,
          lineHeight: DEFAULTS.text.lineHeight,
          letterSpacing: DEFAULTS.text.letterSpacing,
          width: DEFAULTS.text.width,
          height: DEFAULTS.text.height,
          padding: DEFAULTS.text.padding,
          fill: DEFAULTS.text.fill,
          strokeWidth: 0,
          opacity: DEFAULTS.text.opacity,
          shadowBlur: 0,
          shadowOffsetX: 0,
          shadowOffsetY: 0,
          isHidden: false,
          isLocked: false,
        } as ShapeText;
        break;
    }

    setShapes((prev) => [...prev, newShape]);
    setSelectedId(newShape.id);
  }

  // ---------- Atualização de propriedades (genérica + texto) ----------
  useEffect(() => {
    // Patch é uma união, mas NÃO permitimos alterar 'id'/'type'
    type Patch =
      | Partial<Omit<ShapeText, "id" | "type">>
      | Partial<Omit<ShapeRect, "id" | "type">>
      | Partial<Omit<ShapeCircle, "id" | "type">>
      | Partial<Omit<ShapeTriangle, "id" | "type">>
      | Partial<Omit<ShapeLine, "id" | "type">>
      | Partial<Omit<ShapeStar, "id" | "type">>
      | Partial<Omit<ShapeBase, "id" | "type">>;

    const applyPatch = (id: string, incoming: Patch | undefined) => {
      const p = (incoming ?? {}) as Patch;

      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;

          switch (s.type) {
            case "text": {
              const node = shapeRefs.current[id];
              const pt = p as Partial<Omit<ShapeText, "id" | "type">>;
              if (isKonvaTextNode(node)) {
                applyTextPatchToNode(node, pt);
              }
              return { ...s, ...pt } as ShapeText;
            }
            case "rect": {
              const pr = p as Partial<Omit<ShapeRect, "id" | "type">>;
              return { ...s, ...pr } as ShapeRect;
            }
            case "circle": {
              const pc = p as Partial<Omit<ShapeCircle, "id" | "type">>;
              return { ...s, ...pc } as ShapeCircle;
            }
            case "triangle": {
              const ptg = p as Partial<Omit<ShapeTriangle, "id" | "type">>;
              return { ...s, ...ptg } as ShapeTriangle;
            }
            case "line": {
              const pl = p as Partial<Omit<ShapeLine, "id" | "type">>;
              return { ...s, ...pl } as ShapeLine;
            }
            case "star": {
              const ps = p as Partial<Omit<ShapeStar, "id" | "type">>;
              return { ...s, ...ps } as ShapeStar;
            }
            default:
              return s;
          }
        })
      );
    };

    const onUpdateProps = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string; patch?: Patch }>;
      const id = e.detail?.id ?? selectedRef.current;
      if (!id) return;
      applyPatch(id, e.detail?.patch);
    };

    const onUpdateText = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string; patch?: Patch }>;
      const id = e.detail?.id ?? selectedRef.current;
      if (!id) return;
      applyPatch(id, e.detail?.patch);
    };

    window.addEventListener(
      "design-editor:update-props",
      onUpdateProps as EventListener
    );
    window.addEventListener(
      "design-editor:update-text",
      onUpdateText as EventListener
    );

    return () => {
      window.removeEventListener(
        "design-editor:update-props",
        onUpdateProps as EventListener
      );
      window.removeEventListener(
        "design-editor:update-text",
        onUpdateText as EventListener
      );
    };
  }, []);

  // ---------- Delete/Backspace ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const sid = selectedRef.current;
      if (!sid) return;

      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

      if (isEditable) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setShapes((prev) => prev.filter((s) => s.id !== sid));
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={outerRef} className="w-full h-full">
      {/* ⬇️ removemos border/padding para não parecer “outro canvas” */}
      <div className="w-full h-full overflow-auto">
        <div
          ref={measureRef}
          className="w-full h-full relative"
          style={{ minHeight: 360 }}>
          {/* Bridge centraliza listeners e API global */}
          <EventBridge
            onCreate={(type, coords) => {
              const stage = stageRef.current;
              if (!stage) return;

              const t = normalizeType(type);
              const pointer = stage.getPointerPosition();
              const x =
                typeof coords?.x === "number"
                  ? coords.x
                  : pointer?.x ?? stage.width() / 2;
              const y =
                typeof coords?.y === "number"
                  ? coords.y
                  : pointer?.y ?? stage.height() / 2;

              addShapeAt(t, x, y);
            }}
            onSelect={(id) => {
              if (!id) {
                setSelectedId(null);
                return;
              }
              const exists = shapesRef.current.some((s) => s.id === id);
              if (exists) setSelectedId(id);
            }}
            onDelete={(id) => {
              const targetId = id ?? selectedRef.current ?? null;
              if (!targetId) return;
              setShapes((prev) => prev.filter((s) => s.id !== targetId));
              setSelectedId((sid) => (sid === targetId ? null : sid));
            }}
            onToggleHidden={(id) => {
              setShapes((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, isHidden: !s.isHidden } : s
                )
              );
            }}
            onToggleLocked={(id) => {
              setShapes((prev) =>
                prev.map((s) =>
                  s.id === id ? { ...s, isLocked: !s.isLocked } : s
                )
              );
            }}
            onBringForward={(id) => {
              setShapes((prev) => {
                const idx = prev.findIndex((s) => s.id === id);
                if (idx === -1 || idx === prev.length - 1) return prev;
                const copy = [...prev];
                [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
                return copy;
              });
            }}
            onSendBackward={(id) => {
              setShapes((prev) => {
                const idx = prev.findIndex((s) => s.id === id);
                if (idx <= 0) return prev;
                const copy = [...prev];
                [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
                return copy;
              });
            }}
          />

          {/* 🔹 DnD extraído */}
          <DnDContainer
            stageRef={stageRef}
            onDropShape={(type, x, y) => addShapeAt(type, x, y)}
          />

          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            onMouseDown={(e: any) => {
              const clickedOnEmpty = e.target === e.target.getStage();
              if (clickedOnEmpty) setSelectedId(null);
            }}
            onTouchStart={(e: any) => {
              const clickedOnEmpty = e.target === e.target.getStage();
              if (clickedOnEmpty) setSelectedId(null);
            }}>
            {/* 🔹 Artboard ao fundo (não captura eventos) */}
            <ArtboardLayer
              artboard={{ width: artboard.width, height: artboard.height }}
              stageSize={stageSize}
              pad={ARTBOARD_PAD}
            />

            {/* 🔹 Suas camadas existentes */}
            <Layer>
              <ShapesLayer
                shapes={shapes}
                selectedId={selectedId}
                onSelectShape={setSelectedId}
                shapeRefs={shapeRefs}
              />

              <TransformerManager
                selectedId={selectedId}
                shapeRefs={shapeRefs}
              />

              <HintOverlay
                selectedId={selectedId}
                canvasHeight={stageSize.height}
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
