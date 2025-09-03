// src/components/design-editor/Canvas.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import ShapesLayer from "./ShapesLayer";
import EventBridge from "./EventBridge";
import TransformerManager from "./TransformerManager";
import HintOverlay from "./HintOverlay";
import DnDContainer from "./DnDContainer";
import ZoomControls from "./ZoomControls";

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

type ShapeRect = ShapeBase & { type: "rect"; width: number; height: number };
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
  const containerRef = useRef<HTMLDivElement>(null); // container 100%
  const stageRef = useRef<Konva.Stage>(null);

  // 🔹 viewport
  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  // 🔹 zoom/posicionamento
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // shapes/seleção
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null); // primário (compat)
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // multi

  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});

  // Artboard
  const { artboard } = useArtboard();

  // refs anti-stale
  const shapesRef = useRef<AnyShape[]>(shapes);
  const selectedRef = useRef<string | null>(selectedId);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  useEffect(() => {
    shapesRef.current = shapes;
    selectedRef.current = selectedId;
    selectedIdsRef.current = selectedIds;
  }, [shapes, selectedId, selectedIds]);

  // medir container
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

  // FIT
  const fitScale = useMemo(() => {
    if (artboard.width === 0 || artboard.height === 0) return 1;
    const s = Math.min(
      viewport.width / artboard.width,
      viewport.height / artboard.height
    );
    return s * 0.98;
  }, [viewport.width, viewport.height, artboard.width, artboard.height]);

  const applyCenterFromScale = (s: number) => {
    const x = (viewport.width - artboard.width * s) / 2;
    const y = (viewport.height - artboard.height * s) / 2;
    setScale(s);
    setStagePos({ x, y });
  };

  useEffect(() => {
    applyCenterFromScale(fitScale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [artboard.width, artboard.height, fitScale]);

  // emitir estado p/ lateral (inalterado)
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

  // sincroniza propriedades da seleção (usa selectedId como primário)
  useSelectionSync<AnyShape>({
    selectedId,
    shapes,
    defaults: DEFAULTS,
  });

  // helpers coords: Stage -> espaço local (artboard)
  function stageToLocal(sx: number, sy: number) {
    return {
      x: (sx - stagePos.x) / scale,
      y: (sy - stagePos.y) / scale,
    };
  }

  // add shape
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
    setSelectedIds([newShape.id]); // multi
    setSelectedId(newShape.id); // primário (compat)
  }

  // update props
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
            default:
              return { ...s, ...(p as any) } as any;
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

  // pan com espaço
  const isPanningRef = useRef(false);
  const spacePressedRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, stageX: 0, stageY: 0 });

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

  // delete/esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";
      if (isEditable) return;

      if (e.key === "Escape") {
        setSelectedIds([]);
        setSelectedId(null);
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const ids = selectedIdsRef.current;
        if (!ids.length) return;
        e.preventDefault();
        setShapes((prev) => prev.filter((s) => !ids.includes(s.id)));
        setSelectedIds([]);
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // marquee
  type Marquee = {
    active: boolean;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  const [marquee, setMarquee] = useState<Marquee>({
    active: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
  });

  const rectsIntersect = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) =>
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y;

  const beginMarquee = (lx: number, ly: number) => {
    setMarquee({ active: true, x1: lx, y1: ly, x2: lx, y2: ly });
    setSelectedIds([]);
    setSelectedId(null);
  };

  const updateMarquee = (lx: number, ly: number) => {
    setMarquee((m) => (m.active ? { ...m, x2: lx, y2: ly } : m));
  };

  const finishMarquee = () => {
    setMarquee((m) => {
      if (!m.active) return m;
      const x = Math.min(m.x1, m.x2);
      const y = Math.min(m.y1, m.y2);
      const width = Math.abs(m.x2 - m.x1);
      const height = Math.abs(m.y2 - m.y1);

      if (width < 2 && height < 2) {
        return { active: false, x1: 0, y1: 0, x2: 0, y2: 0 };
      }

      const candidates = new Set<string>();
      for (const s of shapesRef.current) {
        const node = shapeRefs.current[s.id] as Konva.Node | null;
        if (!node || (node as any).isDestroyed?.() || !node.getStage())
          continue;
        const bb = node.getClientRect(); // já considera transformações
        if (rectsIntersect({ x, y, width, height }, bb)) candidates.add(s.id);
      }

      // seleciona todos, mantém o “primário” como o do topo
      const ordered = shapesRef.current
        .filter((s) => candidates.has(s.id))
        .map((s) => s.id);
      setSelectedIds(ordered);
      setSelectedId(ordered.length ? ordered[ordered.length - 1] : null);

      return { active: false, x1: 0, y1: 0, x2: 0, y2: 0 };
    });
  };

  // zoom controls
  const handleChangeScale = (s: number) => applyCenterFromScale(s);
  const handleFit = () => applyCenterFromScale(fitScale);

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

          // Se coords não vier (clique nos botões do menu), cria no centro da ARTBOARD
          let sx: number, sy: number;
          if (typeof coords?.x === "number" && typeof coords?.y === "number") {
            sx = coords.x;
            sy = coords.y;
          } else {
            sx = stagePos.x + (artboard.width * scale) / 2;
            sy = stagePos.y + (artboard.height * scale) / 2;
          }

          addShapeAt(t, sx, sy);
        }}
        onSelect={(id) => {
          if (!id) {
            setSelectedIds([]);
            setSelectedId(null);
            return;
          }
          const exists = shapesRef.current.some((s) => s.id === id);
          if (exists) {
            setSelectedIds([id]);
            setSelectedId(id);
          }
        }}
        onDelete={(id) => {
          const targetIds = id ? [id] : selectedIdsRef.current;
          if (!targetIds.length) return;
          setShapes((prev) => prev.filter((s) => !targetIds.includes(s.id)));
          setSelectedIds([]);
          setSelectedId(null);
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

      {/* 🔹 DnD */}
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
          // Início de marquee: botão esquerdo, clique em vazio e sem Space (pan)
          const clickedOnEmpty = e.target === e.target.getStage();
          if (
            e.evt.button === 0 &&
            clickedOnEmpty &&
            !spacePressedRef.current
          ) {
            const stage: Konva.Stage = e.target.getStage();
            const p = stage.getPointerPosition();
            if (p) {
              const l = stageToLocal(p.x, p.y);
              beginMarquee(l.x, l.y);
            }
            return;
          }
          // clique simples em vazio
          if (clickedOnEmpty) {
            setSelectedIds([]);
            setSelectedId(null);
          }
        }}
        onMouseMove={(e: any) => {
          if (!marquee.active) return;
          const stage: Konva.Stage = e.target.getStage();
          const p = stage.getPointerPosition();
          if (p) {
            const l = stageToLocal(p.x, p.y);
            updateMarquee(l.x, l.y);
          }
        }}
        onMouseUp={() => {
          if (marquee.active) finishMarquee();
        }}
        onTouchStart={(e: any) => {
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) {
            setSelectedIds([]);
            setSelectedId(null);
          }
        }}>
        {/* 🔹 Artboard na ORIGEM (0,0) */}
        <ArtboardLayer
          artboard={{ width: artboard.width, height: artboard.height }}
          stageSize={viewport}
          pad={0}
        />

        {/* 🔹 Conteúdo + transformer */}
        <Layer>
          <ShapesLayer
            shapes={shapes}
            selectedId={selectedId} // compat: realce de 1 item
            onSelectShape={(id) => {
              setSelectedIds(id ? [id] : []);
              setSelectedId(id ?? null);
            }}
            shapeRefs={shapeRefs}
          />

          {/* 🔹 Transformer em grupo/único */}
          <TransformerManager
            selectedId={selectedId}
            selectedIds={selectedIds}
            shapeRefs={shapeRefs}
          />

          <HintOverlay selectedId={selectedId} canvasHeight={viewport.height} />
        </Layer>

        {/* 🔹 Marquee overlay */}
        {marquee.active && (
          <Layer listening={false}>
            <Rect
              x={Math.min(marquee.x1, marquee.x2)}
              y={Math.min(marquee.y1, marquee.y2)}
              width={Math.abs(marquee.x2 - marquee.x1)}
              height={Math.abs(marquee.y2 - marquee.y1)}
              fill="rgba(59,130,246,0.08)"
              stroke="#3b82f6"
              strokeWidth={1}
              dash={[4, 4]}
            />
          </Layer>
        )}
      </Stage>

      {/* 🔹 Controles de Zoom */}
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
