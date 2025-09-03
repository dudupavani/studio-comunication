// src/components/design-editor/Canvas.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import type Konva from "konva";
import ShapesLayer from "./ShapesLayer";
import EventBridge from "./EventBridge";
import TransformerManager from "./TransformerManager";
import HintOverlay from "./HintOverlay";
import DnDContainer from "./DnDContainer";
import ZoomControls from "./ZoomControls"; // ⬅️ novo

// 🔹 existentes
import { useSelectionSync } from "@/components/design-editor/hooks/useSelectionSync";
import {
  isKonvaTextNode,
  applyTextPatchToNode,
} from "@/components/design-editor/utils/konvaCache";

// 🔹 artboard
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
  const containerRef = useRef<HTMLDivElement>(null); // container que ocupa 100%
  const stageRef = useRef<Konva.Stage>(null);

  // 🔹 Tamanho do viewport (Stage ocupa 100% disso)
  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  // 🔹 Zoom e posição do Stage (x/y centralizam a artboard)
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // shapes/seleção
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});

  // Artboard (Hook que escuta eventos de template)
  const { artboard } = useArtboard();

  // refs para evitar closures “stale”
  const shapesRef = useRef<AnyShape[]>(shapes);
  const selectedRef = useRef<string | null>(selectedId);
  useEffect(() => {
    shapesRef.current = shapes;
    selectedRef.current = selectedId;
  }, [shapes, selectedId]);

  // ---------- medir container e reagir a resize ----------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      const w = Math.max(320, el.clientWidth);
      const h = Math.max(360, el.clientHeight);
      setViewport({ width: w, height: h });
    };

    const ro = new ResizeObserver(compute);
    ro.observe(el);
    compute();
    return () => ro.disconnect();
  }, []);

  // ---------- FIT: centralizar e ajustar escala para caber na tela ----------
  const fitScale = useMemo(() => {
    if (artboard.width === 0 || artboard.height === 0) return 1;
    const s = Math.min(
      viewport.width / artboard.width,
      viewport.height / artboard.height
    );
    // margem leve
    return s * 0.98;
  }, [viewport.width, viewport.height, artboard.width, artboard.height]);

  const applyCenterFromScale = (s: number) => {
    // centraliza a artboard no viewport
    const x = (viewport.width - artboard.width * s) / 2;
    const y = (viewport.height - artboard.height * s) / 2;
    setScale(s);
    setStagePos({ x, y });
  };

  // Aplica FIT ao entrar e quando template/viewport mudarem
  useEffect(() => {
    applyCenterFromScale(fitScale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artboard.width, artboard.height, fitScale]);

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

  // ---------- helpers coords: Stage -> Artboard local ----------
  function stageToLocal(sx: number, sy: number) {
    return {
      x: (sx - stagePos.x) / scale,
      y: (sy - stagePos.y) / scale,
    };
  }

  // ---------- add shape util (usa coords locais da artboard) ----------
  function addShapeAt(type: AnyShape["type"], sx: number, sy: number) {
    const rid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;
    const { x, y } = stageToLocal(sx, sy);
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
        } as any;
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
        } as any;
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
        } as any;
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
        } as any;
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
        } as any;
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
        } as any;
        break;
    }

    setShapes((prev) => [...prev, newShape]);
    setSelectedId(newShape.id);
  }

  // ---------- Atualização de propriedades (genérica + texto) ----------
  useEffect(() => {
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
              return { ...s, ...pt } as any;
            }
            case "rect":
            case "circle":
            case "triangle":
            case "line":
            case "star":
              return { ...s, ...(p as any) } as any;
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

  // ---------- Pan com espaço (move o Stage; sem scrollbars) ----------
  const isPanningRef = useRef(false);
  const spacePressedRef = useRef(false);
  const panStartRef = useRef({
    x: 0,
    y: 0,
    stageX: 0,
    stageY: 0,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = true;
        document.body.style.cursor = "grab";
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        if (!isPanningRef.current) document.body.style.cursor = "";
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.body.style.cursor = "";
    };
  }, []);

  const onContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // botão do meio (1) sempre pode pan; botão esquerdo (0) somente com espaço
    const allow = e.button === 1 || (e.button === 0 && spacePressedRef.current);
    if (!allow) return;

    isPanningRef.current = true;
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      stageX: stagePos.x,
      stageY: stagePos.y,
    };
    document.body.style.cursor = "grabbing";
    e.preventDefault();
  };

  const onContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanningRef.current) return;
    const dx = e.clientX - panStartRef.current.x;
    const dy = e.clientY - panStartRef.current.y;
    setStagePos({
      x: panStartRef.current.stageX + dx,
      y: panStartRef.current.stageY + dy,
    });
  };

  const onContainerMouseUp = () => {
    if (!isPanningRef.current) return;
    isPanningRef.current = false;
    document.body.style.cursor = spacePressedRef.current ? "grab" : "";
  };

  // ---------- Handlers de ZoomControls ----------
  const handleChangeScale = (s: number) => {
    // centraliza a cada mudança de zoom (mais simples e previsível)
    applyCenterFromScale(s);
  };
  const handleFit = () => {
    applyCenterFromScale(fitScale);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      onMouseDown={onContainerMouseDown}
      onMouseMove={onContainerMouseMove}
      onMouseUp={onContainerMouseUp}
      onMouseLeave={onContainerMouseUp}>
      {/* Bridge centraliza listeners e API global */}
      <EventBridge
        onCreate={(type, coords) => {
          const stage = stageRef.current;
          if (!stage) return;

          const t = normalizeType(type);
          const pointer = stage.getPointerPosition();
          const sx =
            typeof coords?.x === "number"
              ? coords.x
              : pointer?.x ?? viewport.width / 2;
          const sy =
            typeof coords?.y === "number"
              ? coords.y
              : pointer?.y ?? viewport.height / 2;

          addShapeAt(t, sx, sy);
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
            prev.map((s) => (s.id === id ? { ...s, isHidden: !s.isHidden } : s))
          );
        }}
        onToggleLocked={(id) => {
          setShapes((prev) =>
            prev.map((s) => (s.id === id ? { ...s, isLocked: !s.isLocked } : s))
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
        onDropShape={(type, sx, sy) => addShapeAt(type, sx, sy)}
      />

      <Stage
        ref={stageRef}
        width={viewport.width}
        height={viewport.height}
        // zoom/posicionamento
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onMouseDown={(e: any) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) setSelectedId(null);
        }}
        onTouchStart={(e: any) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) setSelectedId(null);
        }}>
        {/* 🔹 Artboard na ORIGEM (0,0) */}
        <ArtboardLayer
          artboard={{ width: artboard.width, height: artboard.height }}
          stageSize={viewport} // assinatura preservada
          pad={0}
        />

        {/* 🔹 Conteúdo + transformer */}
        <Layer>
          <ShapesLayer
            shapes={shapes}
            selectedId={selectedId}
            onSelectShape={setSelectedId}
            shapeRefs={shapeRefs}
          />

          <TransformerManager selectedId={selectedId} shapeRefs={shapeRefs} />

          <HintOverlay selectedId={selectedId} canvasHeight={viewport.height} />
        </Layer>
      </Stage>

      {/* 🔹 Controles de Zoom (canto inferior esquerdo) */}
      <ZoomControls
        scale={scale}
        onChangeScale={handleChangeScale}
        onFit={handleFit}
        min={0.1}
        max={4}
        step={0.01}
      />
    </div>
  );
}
