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

export default function Canvas() {
  // ---------- refs ----------
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null); // wrapper relativo p/ overlay do textarea
  const stageRef = useRef<Konva.Stage>(null);

  const [size, setSize] = useState({ width: 600, height: 450 });

  // ===== estado de shapes (sem itens default) =====
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});
  const trRef = useRef<Konva.Transformer>(null);

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

  // ---------- stage handlers ----------
  const handleStagePointerDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) setSelectedId(null);
  };

  // Duplo clique/tap em área vazia cria texto
  const handleStageDbl = (evt: any) => {
    const stage = stageRef.current;
    if (!stage) return;
    // evita criar se o alvo não for o stage (ex.: clicou em um shape)
    if (evt.target !== evt.target.getStage()) return;

    stage.setPointersPositions(evt.evt as any);
    const pos = stage.getPointerPosition();
    if (!pos) return;
    addShapeAt("text", pos.x, pos.y);
  };

  // ---------- EDITOR INLINE DE TEXTO ----------
  function beginEditText(id: string) {
    const wrap = measureRef.current;
    const stage = stageRef.current;
    const node = shapeRefs.current[id] as Konva.Text | null;
    if (!wrap || !stage || !node) return;

    // pega shape atual
    const s = shapes.find((sh) => sh.id === id);
    if (!s || s.type !== "text") return;
    const T = s as ShapeText;

    // posição absoluta do nó dentro do stage
    const abs = node.absolutePosition();

    // esconder nó enquanto edita
    node.visible(false);
    node.getLayer()?.batchDraw();

    // cria textarea
    const ta = document.createElement("textarea");
    ta.value = T.text || "";
    ta.style.position = "absolute";
    ta.style.left = `${abs.x}px`;
    ta.style.top = `${abs.y}px`;
    ta.style.width = `${T.width ?? DEFAULTS.text.width}px`;
    ta.style.minWidth = "40px";
    ta.style.background = "transparent";
    ta.style.border = "1px dashed #9CA3AF";
    ta.style.outline = "none";
    ta.style.padding = "2px 4px";
    ta.style.margin = "0";
    ta.style.resize = "none";
    ta.style.overflow = "hidden";
    ta.style.zIndex = "10";

    // estilos de texto
    ta.style.fontFamily = T.fontFamily ?? DEFAULTS.text.fontFamily;
    ta.style.fontSize = `${T.fontSize ?? DEFAULTS.text.fontSize}px`;
    ta.style.lineHeight = String(T.lineHeight ?? DEFAULTS.text.lineHeight);
    ta.style.letterSpacing = `${T.letterSpacing ?? 0}px`;
    const style = T.fontStyle ?? "normal";
    ta.style.fontWeight = style.includes("bold") ? "700" : "400";
    ta.style.fontStyle = style.includes("italic") ? "italic" : "normal";
    ta.style.textAlign = T.align ?? "left";
    ta.style.color = T.fill ?? (DEFAULTS.text.fill as string);

    wrap.appendChild(ta);
    ta.focus();
    ta.select();

    const commit = (nextText: string) => {
      setShapes((prev) =>
        prev.map((sh) =>
          sh.id === id
            ? ({ ...(sh as ShapeText), text: nextText } as AnyShape)
            : sh
        )
      );
      cleanup();
    };

    const cancel = () => {
      cleanup();
    };

    const cleanup = () => {
      try {
        wrap.removeChild(ta);
      } catch {}
      node.visible(true);
      node.getLayer()?.batchDraw();
    };

    // auto height conforme conteúdo
    const autosize = () => {
      ta.style.height = "0px";
      ta.style.height = ta.scrollHeight + "px";
    };
    autosize();

    ta.addEventListener("input", autosize);

    ta.addEventListener("keydown", (e) => {
      // Enter confirma (sem Shift)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commit(ta.value);
      }
      // Esc cancela
      if (e.key === "Escape") {
        e.preventDefault();
        cancel();
      }
    });

    ta.addEventListener("blur", () => commit(ta.value));
  }

  // ---------- drag/transform ----------
  const handleDragEnd = (id: string, e: any) => {
    const { x, y } = e.target.position();
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const handleTransformEnd = (id: string) => {
    const node = shapeRefs.current[id];
    if (!node) return;
    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;

    const sx = (node as any).scaleX?.() ?? 1;
    const sy = (node as any).scaleY?.() ?? 1;

    if (shape.type === "rect") {
      const rect = node as Konva.Rect;
      const newWidth = Math.max(5, rect.width() * sx);
      const newHeight = Math.max(5, rect.height() * sy);
      rect.scaleX(1);
      rect.scaleY(1);
      setShapes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...(s as ShapeRect),
                x: rect.x(),
                y: rect.y(),
                width: newWidth,
                height: newHeight,
                rotation: rect.rotation(),
              }
            : s
        )
      );
    }
    if (shape.type === "circle") {
      const circle = node as Konva.Circle;
      const scale = (sx + sy) / 2;
      const newRadius = Math.max(5, circle.radius() * scale);
      circle.scaleX(1);
      circle.scaleY(1);
      setShapes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...(s as ShapeCircle),
                x: circle.x(),
                y: circle.y(),
                radius: newRadius,
                rotation: circle.rotation(),
              }
            : s
        )
      );
    }
    if (shape.type === "triangle") {
      const tri = node as Konva.RegularPolygon;
      const scale = (sx + sy) / 2;
      const newRadius = Math.max(5, tri.radius() * scale);
      tri.scaleX(1);
      tri.scaleY(1);
      setShapes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...(s as ShapeTriangle),
                x: tri.x(),
                y: tri.y(),
                radius: newRadius,
                rotation: tri.rotation(),
              }
            : s
        )
      );
    }
    if (shape.type === "line") {
      const line = node as Konva.Line;
      const pts = line.points();
      const newPts = pts.map((p, i) => (i % 2 === 0 ? p * sx : p * sy));
      line.scaleX(1);
      line.scaleY(1);
      setShapes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...(s as ShapeLine),
                x: line.x(),
                y: line.y(),
                points: newPts,
                rotation: line.rotation(),
              }
            : s
        )
      );
    }
    if (shape.type === "star") {
      const star = node as Konva.Star;
      const scale = (sx + sy) / 2;
      const newInner = Math.max(3, star.innerRadius() * scale);
      const newOuter = Math.max(5, star.outerRadius() * scale);
      star.scaleX(1);
      star.scaleY(1);
      setShapes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...(s as ShapeStar),
                x: star.x(),
                y: star.y(),
                innerRadius: newInner,
                outerRadius: newOuter,
                rotation: star.rotation(),
              }
            : s
        )
      );
    }
    if (shape.type === "text") {
      const textNode = node as Konva.Text;
      const newWidth = Math.max(20, textNode.width() * sx);
      const newHeight = Math.max(20, textNode.height() * sy);
      textNode.scaleX(1);
      textNode.scaleY(1);
      setShapes((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...(s as ShapeText),
                x: textNode.x(),
                y: textNode.y(),
                width: newWidth,
                height: newHeight,
                rotation: textNode.rotation(),
              }
            : s
        )
      );
    }
  };

  // ---------- delete via teclado ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        setShapes((prev) => prev.filter((s) => s.id !== selectedId));
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  function nextName(base: string) {
    const count = shapes.filter((s) => (s.name || "").startsWith(base)).length;
    return `${base} ${count + 1}`;
  }

  // ---------- adicionar via eventos ----------
  useEffect(() => {
    const addRect = () => {
      const id = `rect-${crypto.randomUUID().slice(0, 8)}`;
      const base = 60 + shapes.length * 20;
      setShapes((p) => [
        ...p,
        {
          id,
          type: "rect",
          name: nextName("Retângulo"),
          x: base,
          y: base,
          width: 140,
          height: 100,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          cornerRadius: 10,
          opacity: DEFAULTS.opacity,
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeRect,
      ]);
      setSelectedId(id);
    };
    const addCircle = () => {
      const id = `circle-${crypto.randomUUID().slice(0, 8)}`;
      const base = 120 + shapes.length * 18;
      setShapes((p) => [
        ...p,
        {
          id,
          type: "circle",
          name: nextName("Círculo"),
          x: base,
          y: base,
          radius: 60,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeCircle,
      ]);
      setSelectedId(id);
    };
    const addTriangle = () => {
      const id = `triangle-${crypto.randomUUID().slice(0, 8)}`;
      const base = 100 + shapes.length * 16;
      setShapes((p) => [
        ...p,
        {
          id,
          type: "triangle",
          name: nextName("Triângulo"),
          x: base,
          y: base,
          radius: 70,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeTriangle,
      ]);
      setSelectedId(id);
    };
    const addLine = () => {
      const id = `line-${crypto.randomUUID().slice(0, 8)}`;
      const base = 80 + shapes.length * 14;
      setShapes((p) => [
        ...p,
        {
          id,
          type: "line",
          name: nextName("Linha"),
          x: base,
          y: base,
          points: [-70, 0, 70, 0],
          rotation: 0,
          stroke: DEFAULTS.line.stroke,
          strokeWidth: DEFAULTS.line.strokeWidth,
          opacity: DEFAULTS.line.opacity,
          shadowBlur: DEFAULTS.line.shadowBlur,
          shadowOffsetX: DEFAULTS.line.shadowOffsetX,
          shadowOffsetY: DEFAULTS.line.shadowOffsetY,
          lineCap: "round",
          isHidden: false,
          isLocked: false,
        } as ShapeLine,
      ]);
      setSelectedId(id);
    };
    const addStar = () => {
      const id = `star-${crypto.randomUUID().slice(0, 8)}`;
      const base = 140 + shapes.length * 12;
      setShapes((p) => [
        ...p,
        {
          id,
          type: "star",
          name: nextName("Estrela"),
          x: base,
          y: base,
          numPoints: 5,
          innerRadius: 30,
          outerRadius: 70,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeStar,
      ]);
      setSelectedId(id);
    };
    const addText = () => {
      const id = `text-${crypto.randomUUID().slice(0, 8)}`;
      const base = 80 + shapes.length * 12;
      setShapes((p) => [
        ...p,
        {
          id,
          type: "text",
          name: nextName("Texto"),
          x: base,
          y: base,
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
          fill: DEFAULTS.text.fill,
          strokeWidth: 0,
          opacity: DEFAULTS.text.opacity,
          shadowBlur: DEFAULTS.text.shadowBlur,
          shadowOffsetX: DEFAULTS.text.shadowOffsetX,
          shadowOffsetY: DEFAULTS.text.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeText,
      ]);
      setSelectedId(id);
    };

    const onAddRect = () => addRect();
    const onAddCircle = () => addCircle();
    const onAddTriangle = () => addTriangle();
    const onAddLine = () => addLine();
    const onAddStar = () => addStar();
    const onAddText = () => addText();

    window.addEventListener(
      "design-editor:add-rect",
      onAddRect as EventListener
    );
    window.addEventListener(
      "design-editor:add-circle",
      onAddCircle as EventListener
    );
    window.addEventListener(
      "design-editor:add-triangle",
      onAddTriangle as EventListener
    );
    window.addEventListener(
      "design-editor:add-line",
      onAddLine as EventListener
    );
    window.addEventListener(
      "design-editor:add-star",
      onAddStar as EventListener
    );
    window.addEventListener(
      "design-editor:add-text",
      onAddText as EventListener
    );

    return () => {
      window.removeEventListener(
        "design-editor:add-rect",
        onAddRect as EventListener
      );
      window.removeEventListener(
        "design-editor:add-circle",
        onAddCircle as EventListener
      );
      window.removeEventListener(
        "design-editor:add-triangle",
        onAddTriangle as EventListener
      );
      window.removeEventListener(
        "design-editor:add-line",
        onAddLine as EventListener
      );
      window.removeEventListener(
        "design-editor:add-star",
        onAddStar as EventListener
      );
      window.removeEventListener(
        "design-editor:add-text",
        onAddText as EventListener
      );
    };
  }, [shapes.length]);

  // ---------- comandos vindos do painel de camadas ----------
  useEffect(() => {
    const onSelect = (e: any) => {
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      const target = shapes.find((s) => s.id === id);
      if (!target || target.isLocked) return;
      setSelectedId(id);
    };
    const onToggleHidden = (e: any) => {
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isHidden: !s.isHidden } : s))
      );
      if (selectedId === id && shapes.find((s) => s.id === id)?.isHidden) {
        setSelectedId(null);
      }
    };
    const onToggleLocked = (e: any) => {
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isLocked: !s.isLocked } : s))
      );
      if (selectedId === id) setSelectedId(null);
    };
    const onBringForward = (e: any) => {
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) => {
        const i = prev.findIndex((s) => s.id === id);
        if (i === -1 || i === prev.length - 1) return prev;
        const next = [...prev];
        const [item] = next.splice(i, 1);
        next.splice(i + 1, 0, item);
        return next;
      });
    };
    const onSendBackward = (e: any) => {
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) => {
        const i = prev.findIndex((s) => s.id === id);
        if (i <= 0) return prev;
        const next = [...prev];
        const [item] = next.splice(i, 1);
        next.splice(i - 1, 0, item);
        return next;
      });
    };
    const onDelete = (e: any) => {
      const id = e.detail?.id as string | undefined;
      if (!id) return;
      setShapes((prev) => prev.filter((s) => s.id !== id));
      if (selectedId === id) setSelectedId(null);
    };

    window.addEventListener("design-editor:select", onSelect as EventListener);
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
    window.addEventListener("design-editor:delete", onDelete as EventListener);

    return () => {
      window.removeEventListener(
        "design-editor:select",
        onSelect as EventListener
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
      window.removeEventListener(
        "design-editor:delete",
        onDelete as EventListener
      );
    };
  }, [shapes, selectedId]);

  // ---------- receber PATCH de propriedades ----------
  useEffect(() => {
    const onUpdateProps = (e: any) => {
      const detail = e.detail || {};
      const id: string | null = detail.id ?? selectedId ?? null;
      if (!id) return;

      const patch = detail.patch as Partial<
        Pick<
          ShapeBase,
          | "fill"
          | "stroke"
          | "strokeWidth"
          | "opacity"
          | "shadowBlur"
          | "shadowOffsetX"
          | "shadowOffsetY"
        > & {
          text?: string;
          fontFamily?: string;
          fontSize?: number;
          fontStyle?: "normal" | "bold" | "italic" | "bold italic";
          align?: "left" | "center" | "right" | "justify";
          lineHeight?: number;
          letterSpacing?: number;
          width?: number;
        }
      >;

      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const next: AnyShape = { ...s };

          if (s.type !== "line" && patch.fill !== undefined)
            next.fill = patch.fill;
          if (s.type !== "text" && patch.stroke !== undefined)
            next.stroke = patch.stroke;

          if (patch.strokeWidth !== undefined) {
            const sw = Math.max(0, Number(patch.strokeWidth) || 0);
            next.strokeWidth = s.type === "text" ? 0 : sw;
          }
          if (patch.opacity !== undefined) {
            const op = Math.min(1, Math.max(0, Number(patch.opacity)));
            next.opacity = isFinite(op) ? op : s.opacity ?? 1;
          }
          if (patch.shadowBlur !== undefined)
            next.shadowBlur = Math.max(0, Number(patch.shadowBlur) || 0);
          if (patch.shadowOffsetX !== undefined) {
            const v = Number(patch.shadowOffsetX);
            next.shadowOffsetX = isFinite(v) ? v : s.shadowOffsetX ?? 0;
          }
          if (patch.shadowOffsetY !== undefined) {
            const v = Number(patch.shadowOffsetY);
            next.shadowOffsetY = isFinite(v) ? v : s.shadowOffsetY ?? 0;
          }

          if (s.type === "text") {
            const T = next as ShapeText;
            if (patch.text !== undefined) T.text = String(patch.text);
            if (patch.fontFamily !== undefined)
              T.fontFamily = String(patch.fontFamily);
            if (patch.fontSize !== undefined)
              T.fontSize = Math.max(1, Number(patch.fontSize) || 1);
            if (patch.fontStyle !== undefined) T.fontStyle = patch.fontStyle;
            if (patch.align !== undefined) T.align = patch.align;
            if (patch.lineHeight !== undefined)
              T.lineHeight = Math.max(0.5, Number(patch.lineHeight) || 1);
            if (patch.letterSpacing !== undefined)
              T.letterSpacing = Number(patch.letterSpacing) || 0;
            if (patch.width !== undefined)
              T.width = Math.max(20, Number(patch.width) || 20);
          }
          return next;
        })
      );
    };

    window.addEventListener(
      "design-editor:update-props",
      onUpdateProps as EventListener
    );
    return () =>
      window.removeEventListener(
        "design-editor:update-props",
        onUpdateProps as EventListener
      );
  }, [selectedId]);

  // ---------- drop do submenu no Stage ----------
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();

    const onDragOver = (ev: DragEvent) => ev.preventDefault();
    const onDrop = (ev: DragEvent) => {
      ev.preventDefault();
      stage.setPointersPositions(ev as any);
      const pos = stage.getPointerPosition();
      if (!pos) return;

      let payload: any = null;
      const raw =
        ev.dataTransfer?.getData(DND_MIME) ||
        ev.dataTransfer?.getData("text/plain");
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = raw ? { type: String(raw) } : null;
      }

      const type = payload?.type as AnyShape["type"] | undefined;
      if (!type) return;
      addShapeAt(type, pos.x, pos.y);
    };

    container.addEventListener("dragover", onDragOver);
    container.addEventListener("drop", onDrop);
    return () => {
      container.removeEventListener("dragover", onDragOver);
      container.removeEventListener("drop", onDrop);
    };
  }, []);

  function addShapeAt(type: AnyShape["type"], x: number, y: number) {
    const rid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;
    if (type === "rect") {
      const id = rid("rect");
      const width = 140,
        height = 100;
      setShapes((prev) => [
        ...prev,
        {
          id,
          type,
          name: nextName("Retângulo"),
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          cornerRadius: 10,
          opacity: DEFAULTS.opacity,
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeRect,
      ]);
      setSelectedId(id);
      return;
    }
    if (type === "circle") {
      const id = rid("circle");
      const radius = 60;
      setShapes((prev) => [
        ...prev,
        {
          id,
          type,
          name: nextName("Círculo"),
          x,
          y,
          radius,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeCircle,
      ]);
      setSelectedId(id);
      return;
    }
    if (type === "triangle") {
      const id = rid("triangle");
      const radius = 70;
      setShapes((prev) => [
        ...prev,
        {
          id,
          type,
          name: nextName("Triângulo"),
          x,
          y,
          radius,
          rotation: 0,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
          opacity: DEFAULTS.opacity,
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeTriangle,
      ]);
      setSelectedId(id);
      return;
    }
    if (type === "line") {
      const id = rid("line");
      setShapes((prev) => [
        ...prev,
        {
          id,
          type,
          name: nextName("Linha"),
          x,
          y,
          points: [-70, 0, 70, 0],
          rotation: 0,
          stroke: DEFAULTS.line.stroke,
          strokeWidth: DEFAULTS.line.strokeWidth,
          opacity: DEFAULTS.line.opacity,
          shadowBlur: DEFAULTS.line.shadowBlur,
          shadowOffsetX: DEFAULTS.line.shadowOffsetX,
          shadowOffsetY: DEFAULTS.line.shadowOffsetY,
          lineCap: "round",
          isHidden: false,
          isLocked: false,
        } as ShapeLine,
      ]);
      setSelectedId(id);
      return;
    }
    if (type === "star") {
      const id = rid("star");
      setShapes((prev) => [
        ...prev,
        {
          id,
          type,
          name: nextName("Estrela"),
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
          shadowBlur: DEFAULTS.shadowBlur,
          shadowOffsetX: DEFAULTS.shadowOffsetX,
          shadowOffsetY: DEFAULTS.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeStar,
      ]);
      setSelectedId(id);
      return;
    }
    if (type === "text") {
      const id = rid("text");
      setShapes((prev) => [
        ...prev,
        {
          id,
          type,
          name: nextName("Texto"),
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
          fill: DEFAULTS.text.fill,
          strokeWidth: 0,
          opacity: DEFAULTS.text.opacity,
          shadowBlur: DEFAULTS.text.shadowBlur,
          shadowOffsetX: DEFAULTS.text.shadowOffsetX,
          shadowOffsetY: DEFAULTS.text.shadowOffsetY,
          isHidden: false,
          isLocked: false,
        } as ShapeText,
      ]);
      setSelectedId(id);
      return;
    }
  }

  // ---------- dica ----------
  const hint = useMemo(() => {
    if (selectedId)
      return "Dica: clique novamente no texto selecionado (ou duplo clique) para editar. Delete/Backspace remove o elemento.";
    return "Dica: duplo clique em área vazia insere texto. Arraste itens do painel à esquerda para o canvas. Clique para selecionar; arraste para mover; use as alças para redimensionar/rotacionar.";
  }, [selectedId]);

  return (
    <div ref={outerRef} className="w-full">
      <div className="border p-3 bg-white w-full overflow-hidden">
        {/* wrapper relativo para posicionar o textarea de edição inline */}
        <div ref={measureRef} className="w-full relative">
          <Stage
            ref={stageRef}
            width={size.width}
            height={size.height}
            onMouseDown={handleStagePointerDown}
            onTouchStart={handleStagePointerDown}
            onDblClick={handleStageDbl}
            onDblTap={handleStageDbl}>
            <Layer>
              {shapes.map((s) => {
                const baseProps = {
                  ref: (node: any) => {
                    shapeRefs.current[s.id] = node;
                  },
                  name: s.id,
                  x: s.x,
                  y: s.y,
                  rotation: s.rotation,
                  visible: !s.isHidden,
                  listening: !s.isLocked,
                  draggable: !s.isLocked,
                  opacity: s.opacity,
                  shadowBlur: s.shadowBlur,
                  shadowOffsetX: s.shadowOffsetX,
                  shadowOffsetY: s.shadowOffsetY,
                } as const;

                if (s.type === "rect") {
                  const r = s as ShapeRect;
                  return (
                    <Rect
                      key={r.id}
                      {...baseProps}
                      onClick={() => !r.isLocked && setSelectedId(r.id)}
                      onTap={() => !r.isLocked && setSelectedId(r.id)}
                      width={r.width}
                      height={r.height}
                      cornerRadius={r.cornerRadius}
                      fill={r.fill}
                      stroke={r.stroke}
                      strokeWidth={r.strokeWidth}
                      onDragEnd={(e) => handleDragEnd(r.id, e)}
                      onTransformEnd={() => handleTransformEnd(r.id)}
                    />
                  );
                }

                if (s.type === "circle") {
                  const c = s as ShapeCircle;
                  return (
                    <KonvaCircle
                      key={c.id}
                      {...baseProps}
                      onClick={() => !c.isLocked && setSelectedId(c.id)}
                      onTap={() => !c.isLocked && setSelectedId(c.id)}
                      radius={c.radius}
                      fill={c.fill}
                      stroke={c.stroke}
                      strokeWidth={c.strokeWidth}
                      onDragEnd={(e) => handleDragEnd(c.id, e)}
                      onTransformEnd={() => handleTransformEnd(c.id)}
                    />
                  );
                }

                if (s.type === "triangle") {
                  const t = s as ShapeTriangle;
                  return (
                    <KonvaRegularPolygon
                      key={t.id}
                      {...baseProps}
                      onClick={() => !t.isLocked && setSelectedId(t.id)}
                      onTap={() => !t.isLocked && setSelectedId(t.id)}
                      sides={3}
                      radius={t.radius}
                      fill={t.fill}
                      stroke={t.stroke}
                      strokeWidth={t.strokeWidth}
                      onDragEnd={(e) => handleDragEnd(t.id, e)}
                      onTransformEnd={() => handleTransformEnd(t.id)}
                    />
                  );
                }

                if (s.type === "line") {
                  const l = s as ShapeLine;
                  return (
                    <KonvaLine
                      key={l.id}
                      {...baseProps}
                      onClick={() => !l.isLocked && setSelectedId(l.id)}
                      onTap={() => !l.isLocked && setSelectedId(l.id)}
                      points={l.points}
                      stroke={l.stroke}
                      strokeWidth={l.strokeWidth}
                      lineCap={l.lineCap}
                      onDragEnd={(e) => handleDragEnd(l.id, e)}
                      onTransformEnd={() => handleTransformEnd(l.id)}
                    />
                  );
                }

                if (s.type === "star") {
                  const st = s as ShapeStar;
                  return (
                    <KonvaStar
                      key={st.id}
                      {...baseProps}
                      onClick={() => !st.isLocked && setSelectedId(st.id)}
                      onTap={() => !st.isLocked && setSelectedId(st.id)}
                      numPoints={st.numPoints}
                      innerRadius={st.innerRadius}
                      outerRadius={st.outerRadius}
                      fill={st.fill}
                      stroke={st.stroke}
                      strokeWidth={st.strokeWidth}
                      onDragEnd={(e) => handleDragEnd(st.id, e)}
                      onTransformEnd={() => handleTransformEnd(st.id)}
                    />
                  );
                }

                const tx = s as ShapeText;
                return (
                  <KonvaText
                    key={tx.id}
                    {...baseProps}
                    onClick={() => {
                      if (tx.isLocked) return;
                      if (selectedId === tx.id) {
                        // clique novamente no selecionado => editar
                        beginEditText(tx.id);
                      } else {
                        setSelectedId(tx.id);
                      }
                    }}
                    onDblClick={() => !tx.isLocked && beginEditText(tx.id)}
                    onTap={() => !tx.isLocked && setSelectedId(tx.id)}
                    text={tx.text}
                    fontFamily={tx.fontFamily}
                    fontSize={tx.fontSize}
                    fontStyle={tx.fontStyle}
                    align={tx.align}
                    lineHeight={tx.lineHeight}
                    letterSpacing={tx.letterSpacing}
                    width={tx.width}
                    height={tx.height}
                    fill={tx.fill}
                    onDragEnd={(e) => handleDragEnd(tx.id, e)}
                    onTransformEnd={() => handleTransformEnd(tx.id)}
                  />
                );
              })}

              <Transformer
                ref={trRef}
                rotateEnabled
                enabledAnchors={[
                  "top-left",
                  "top-right",
                  "bottom-left",
                  "bottom-right",
                  "middle-left",
                  "middle-right",
                  "top-center",
                  "bottom-center",
                ]}
              />

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
