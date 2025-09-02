// src/components/design-editor/Canvas.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text as KonvaText,
  Transformer,
  Circle as KonvaCircle,
  RegularPolygon as KonvaRegularPolygon,
  Line as KonvaLine,
  Star as KonvaStar,
} from "react-konva";
import type Konva from "konva";

// ========= Constantes =========
const DND_MIME = "application/x-design-editor";

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
  cornerRadius?: number;
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

// ========= Helper DnD / Normalização =========
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

export default function Canvas() {
  // ---------- refs ----------
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [size, setSize] = useState({ width: 600, height: 450 });
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});
  const trRef = useRef<Konva.Transformer>(null);

  // refs para evitar closures “stale”
  const shapesRef = useRef<AnyShape[]>(shapes);
  const selectedRef = useRef<string | null>(selectedId);
  useEffect(() => {
    shapesRef.current = shapes;
    selectedRef.current = selectedId;
  }, [shapes, selectedId]);

  // ---------- responsivo ----------
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => {
      const w = Math.max(320, Math.floor(el.clientWidth));
      setSize((prev) => {
        if (prev.width === w) return prev;
        const h = Math.max(360, Math.round((w * 9) / 16));
        return { width: w, height: h };
      });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  // ---------- transformer ----------
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    if (selectedId && shapeRefs.current[selectedId]) {
      tr.nodes([shapeRefs.current[selectedId]!]);
    } else {
      tr.nodes([]);
    }
    tr.getLayer()?.batchDraw();
  }, [selectedId, shapes.length]);

  // ---------- emitir estado p/ camadas ----------
  function emitState() {
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
  }
  useEffect(() => {
    emitState();
  }, [shapes, selectedId]);

  // ---------- emitir props p/ painel ----------
  function emitSelectionProps() {
    if (typeof window === "undefined") return;
    const sel =
      (selectedId &&
        (shapes.find((s) => s.id === selectedId) as AnyShape | undefined)) ||
      null;

    let detail: any = null;
    if (sel) {
      const base = {
        id: sel.id,
        type: sel.type,
        name: sel.name || sel.id,
        fill: sel.type === "line" ? undefined : sel.fill ?? DEFAULTS.fill,
        stroke:
          sel.type === "text"
            ? undefined
            : sel.stroke ??
              (sel.type === "line" ? DEFAULTS.line.stroke : DEFAULTS.stroke),
        strokeWidth:
          sel.strokeWidth ??
          (sel.type === "line"
            ? DEFAULTS.line.strokeWidth
            : DEFAULTS.strokeWidth),
        opacity: sel.opacity ?? DEFAULTS.opacity,
        shadowBlur: sel.shadowBlur ?? DEFAULTS.shadowBlur,
        shadowOffsetX: sel.shadowOffsetX ?? DEFAULTS.shadowOffsetX,
        shadowOffsetY: sel.shadowOffsetY ?? DEFAULTS.shadowOffsetY,
      };

      if (isShapeText(sel)) {
        detail = {
          ...base,
          text: sel.text ?? DEFAULTS.text.text,
          fontFamily: sel.fontFamily ?? DEFAULTS.text.fontFamily,
          fontSize: sel.fontSize ?? DEFAULTS.text.fontSize,
          fontStyle: sel.fontStyle ?? DEFAULTS.text.fontStyle,
          align: sel.align ?? DEFAULTS.text.align,
          lineHeight: sel.lineHeight ?? DEFAULTS.text.lineHeight,
          letterSpacing: sel.letterSpacing ?? DEFAULTS.text.letterSpacing,
          width: sel.width ?? DEFAULTS.text.width,
          height: sel.height ?? DEFAULTS.text.height,
          padding: sel.padding ?? DEFAULTS.text.padding,
        };
      } else {
        detail = base;
      }
    }

    window.dispatchEvent(
      new CustomEvent("design-editor:selection-props", { detail })
    );
  }
  useEffect(() => {
    emitSelectionProps();
  }, [selectedId, shapes]);

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
          cornerRadius: 10,
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

  // ---------- stage handlers ----------
  const handleStagePointerDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) setSelectedId(null);
  };

  // (SEM duplo-clique para criar texto)

  // ---------- DnD: listeners no container do Stage ----------
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

      // posição relativa ao Stage
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // garante que caiu dentro do Stage
      if (x < 0 || y < 0 || x > stage.width() || y > stage.height()) return;

      addShapeAt(type, x, y);
    };

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);

    return () => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
    };
  }, [size.width, size.height]);

  // ---------- Criação por clique no menu ----------
  useEffect(() => {
    const onCreate = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const t = normalizeType(e?.detail?.type ?? "text");

      const stage = stageRef.current;
      if (!stage) return;

      // usa posição informada, ou ponteiro atual se sobre o canvas, senão centro
      const pointer = stage.getPointerPosition();
      const x =
        typeof e?.detail?.x === "number"
          ? e.detail.x
          : pointer?.x ?? stage.width() / 2;
      const y =
        typeof e?.detail?.y === "number"
          ? e.detail.y
          : pointer?.y ?? stage.height() / 2;

      addShapeAt(t, x, y);
    };

    window.addEventListener(
      "design-editor:create-shape",
      onCreate as EventListener
    );

    // API global alternativa (opcional)
    (globalThis as any).designEditor = {
      ...(globalThis as any).designEditor,
      create: (type: ShapeKind, coords?: { x?: number; y?: number }) => {
        const stage = stageRef.current;
        if (!stage) return;
        const t = normalizeType(type);
        const x = typeof coords?.x === "number" ? coords!.x : stage.width() / 2;
        const y =
          typeof coords?.y === "number" ? coords!.y : stage.height() / 2;
        addShapeAt(t, x, y);
      },
    };

    return () => {
      window.removeEventListener(
        "design-editor:create-shape",
        onCreate as EventListener
      );
    };
  }, []);

  // ---------- Comandos vindos do EditorShell ----------
  useEffect(() => {
    const onSelect = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const id = (e.detail?.id ?? null) as string | null;
      if (!id) {
        setSelectedId(null);
        return;
      }
      const exists = shapesRef.current.some((s) => s.id === id);
      if (exists) setSelectedId(id);
    };

    const onDelete = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const id = (e.detail?.id ?? selectedRef.current ?? null) as string | null;
      if (!id) return;
      setShapes((prev) => prev.filter((s) => s.id !== id));
      setSelectedId((sid) => (sid === id ? null : sid));
    };

    const onToggleHidden = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isHidden: !s.isHidden } : s))
      );
    };

    const onToggleLocked = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isLocked: !s.isLocked } : s))
      );
    };

    const onBringForward = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx === -1 || idx === prev.length - 1) return prev;
        const copy = [...prev];
        [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
        return copy;
      });
    };

    const onSendBackward = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) => {
        const idx = prev.findIndex((s) => s.id === id);
        if (idx <= 0) return prev;
        const copy = [...prev];
        [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
        return copy;
      });
    };

    window.addEventListener("design-editor:select", onSelect as EventListener);
    window.addEventListener("design-editor:delete", onDelete as EventListener);
    window.addEventListener(
      "design-editor:toggle-hidden",
      onToggleHidden as EventListener
    );
    window.addEventListener(
      "design-editor:toggle-locked",
      onToggleLocked as EventListener
    );
    window.addEventListener(
      "design-editor:bring-forward",
      onBringForward as EventListener
    );
    window.addEventListener(
      "design-editor:send-backward",
      onSendBackward as EventListener
    );

    return () => {
      window.removeEventListener(
        "design-editor:select",
        onSelect as EventListener
      );
      window.removeEventListener(
        "design-editor:delete",
        onDelete as EventListener
      );
      window.removeEventListener(
        "design-editor:toggle-hidden",
        onToggleHidden as EventListener
      );
      window.removeEventListener(
        "design-editor:toggle-locked",
        onToggleLocked as EventListener
      );
      window.removeEventListener(
        "design-editor:bring-forward",
        onBringForward as EventListener
      );
      window.removeEventListener(
        "design-editor:send-backward",
        onSendBackward as EventListener
      );
    };
  }, []);

  // ---------- Atualização de propriedades (genérica + texto) ----------
  useEffect(() => {
    type Patch = Partial<
      ShapeText &
        ShapeRect &
        ShapeCircle &
        ShapeTriangle &
        ShapeLine &
        ShapeStar &
        ShapeBase
    >;

    const applyPatch = (id: string, patch: Patch) => {
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          
          // Se for uma atualização de fonte, limpa o cache
          if (patch.fontFamily && s.type === "text") {
            const node = shapeRefs.current[id];
            if (node) {
              // Limpa o cache para forçar re-renderização
              if (typeof node.clearCache === 'function') {
                node.clearCache();
              }
              // Atualiza o nó diretamente para garantir aplicação imediata
              if (typeof node.fontFamily === 'function') {
                node.fontFamily(patch.fontFamily);
              }
              // Redesenha a camada
              if (typeof node.getLayer === 'function' && typeof node.getLayer()?.batchDraw === 'function') {
                node.getLayer()?.batchDraw();
              }
            }
          }
          
          return { ...s, ...patch };
        })
      );
    };

    const onUpdateProps = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string; patch: Patch }>;
      const id = e.detail?.id ?? selectedRef.current;
      if (!id) return;
      const patch = e.detail?.patch || {};
      applyPatch(id, patch);
    };

    const onUpdateText = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string; patch: Patch }>;
      const id = e.detail?.id ?? selectedRef.current;
      if (!id) return;
      const patch = e.detail?.patch || {};
      applyPatch(id, patch);
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

  // ---------- dica ----------
  const hint = useMemo(() => {
    if (selectedId)
      return "Dica: selecione para mover/transformar. Delete/Backspace remove o elemento.";
    return "Dica: arraste itens do painel para o canvas, ou clique no menu para criar. Clique para selecionar; arraste para mover; use as alças para redimensionar/rotacionar.";
  }, [selectedId]);

  return (
    <div ref={outerRef} className="w-full">
      <div className="border p-3 bg-white w-full overflow-hidden">
        <div ref={measureRef} className="w-full relative">
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onMouseDown={handleStagePointerDown}
            onTouchStart={handleStagePointerDown}>
            <Layer>
              {shapes.map((s) => {
                // refs por shape
                const setRef = (node: any) => {
                  shapeRefs.current[s.id] = node;
                };

                if (s.type === "rect") {
                  const rect = s as ShapeRect;
                  return (
                    <Rect
                      key={s.id}
                      ref={setRef}
                      x={s.x}
                      y={s.y}
                      rotation={s.rotation}
                      visible={!s.isHidden}
                      listening={!s.isLocked}
                      draggable={!s.isLocked}
                      opacity={s.opacity}
                      shadowBlur={s.shadowBlur}
                      shadowOffsetX={s.shadowOffsetX}
                      shadowOffsetY={s.shadowOffsetY}
                      onClick={() => setSelectedId(s.id)}
                      onTap={() => setSelectedId(s.id)}
                      width={rect.width}
                      height={rect.height}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={s.strokeWidth}
                    />
                  );
                }
                if (s.type === "circle") {
                  const c = s as ShapeCircle;
                  return (
                    <KonvaCircle
                      key={s.id}
                      ref={setRef}
                      x={s.x}
                      y={s.y}
                      rotation={s.rotation}
                      visible={!s.isHidden}
                      listening={!s.isLocked}
                      draggable={!s.isLocked}
                      opacity={s.opacity}
                      shadowBlur={s.shadowBlur}
                      shadowOffsetX={s.shadowOffsetX}
                      shadowOffsetY={s.shadowOffsetY}
                      onClick={() => setSelectedId(s.id)}
                      onTap={() => setSelectedId(s.id)}
                      radius={c.radius}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={s.strokeWidth}
                    />
                  );
                }
                if (s.type === "triangle") {
                  const t = s as ShapeTriangle;
                  return (
                    <KonvaRegularPolygon
                      key={s.id}
                      ref={setRef}
                      x={s.x}
                      y={s.y}
                      rotation={s.rotation}
                      visible={!s.isHidden}
                      listening={!s.isLocked}
                      draggable={!s.isLocked}
                      opacity={s.opacity}
                      shadowBlur={s.shadowBlur}
                      shadowOffsetX={s.shadowOffsetX}
                      shadowOffsetY={s.shadowOffsetY}
                      onClick={() => setSelectedId(s.id)}
                      onTap={() => setSelectedId(s.id)}
                      sides={3}
                      radius={t.radius}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={s.strokeWidth}
                    />
                  );
                }
                if (s.type === "line") {
                  const l = s as ShapeLine;
                  return (
                    <KonvaLine
                      key={s.id}
                      ref={setRef}
                      x={s.x}
                      y={s.y}
                      rotation={s.rotation}
                      visible={!s.isHidden}
                      listening={!s.isLocked}
                      draggable={!s.isLocked}
                      opacity={s.opacity}
                      shadowBlur={s.shadowBlur}
                      shadowOffsetX={s.shadowOffsetX}
                      shadowOffsetY={s.shadowOffsetY}
                      onClick={() => setSelectedId(s.id)}
                      onTap={() => setSelectedId(s.id)}
                      points={l.points}
                      stroke={s.stroke}
                      strokeWidth={s.strokeWidth}
                      lineCap={l.lineCap}
                    />
                  );
                }
                if (s.type === "star") {
                  const st = s as ShapeStar;
                  return (
                    <KonvaStar
                      key={s.id}
                      ref={setRef}
                      x={s.x}
                      y={s.y}
                      rotation={s.rotation}
                      visible={!s.isHidden}
                      listening={!s.isLocked}
                      draggable={!s.isLocked}
                      opacity={s.opacity}
                      shadowBlur={s.shadowBlur}
                      shadowOffsetX={s.shadowOffsetX}
                      shadowOffsetY={s.shadowOffsetY}
                      onClick={() => setSelectedId(s.id)}
                      onTap={() => setSelectedId(s.id)}
                      numPoints={st.numPoints}
                      innerRadius={st.innerRadius}
                      outerRadius={st.outerRadius}
                      fill={s.fill}
                      stroke={s.stroke}
                      strokeWidth={s.strokeWidth}
                    />
                  );
                }
                if (s.type === "text") {
                  const tx = s as ShapeText;
                  return (
                    <KonvaText
                      key={s.id}
                      ref={setRef}
                      x={s.x}
                      y={s.y}
                      rotation={s.rotation}
                      visible={!s.isHidden}
                      listening={!s.isLocked}
                      draggable={!s.isLocked}
                      opacity={s.opacity}
                      shadowBlur={s.shadowBlur}
                      shadowOffsetX={s.shadowOffsetX}
                      shadowOffsetY={s.shadowOffsetY}
                      onClick={() => setSelectedId(s.id)}
                      onTap={() => setSelectedId(s.id)}
                      text={tx.text}
                      fontFamily={tx.fontFamily}
                      fontSize={tx.fontSize}
                      fontStyle={tx.fontStyle}
                      align={tx.align}
                      lineHeight={tx.lineHeight}
                      letterSpacing={tx.letterSpacing}
                      width={tx.width}
                      height={tx.height}
                      padding={tx.padding ?? 0}
                      fill={s.fill}
                    />
                  );
                }
                return null;
              })}

              <Transformer ref={trRef} rotateEnabled />
              <KonvaText
                text={hint}
                x={16}
                y={size.height - 28}
                fontSize={14}
                fill="#374151"
              />
            </Layer>
          </Stage>
        </div>
      </div>
    </div>
  );
}
