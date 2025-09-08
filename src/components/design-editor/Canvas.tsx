// src/components/design-editor/Canvas.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Fragment,
} from "react";
import type Konva from "konva";
import {
  Stage,
  Layer,
  Group,
  Rect,
  Circle,
  Line,
  Star,
  RegularPolygon,
  Text as KText,
} from "react-konva";

import EventBridge from "./EventBridge";
import DnDContainer from "./DnDContainer";
import ZoomControls from "./ZoomControls";
import TransformerManager from "@/components/design-editor/TransformerManager";
import MarqueeOverlay from "@/components/design-editor/layers/MarqueeOverlay";

import {
  isKonvaTextNode,
  applyTextPatchToNode,
} from "@/components/design-editor/utils/konvaCache";
import { isInputLike } from "@/components/design-editor/utils/is-input-like";

import { useArtboard } from "@/hooks/design-editor/use-artboard";
import ArtboardLayer from "@/components/design-editor/ArtboardLayer";
import { DESIGN_DEFAULTS as DEFAULTS } from "@/components/design-editor/constants/design-defaults";

import {
  normalizeType,
  AnyShape,
  ShapeRect,
  ShapeCircle,
  ShapeTriangle,
  ShapeLine,
  ShapeStar,
  ShapeText,
} from "@/components/design-editor/types/shapes";

import { useSelectionContext } from "@/components/design-editor/SelectionContext";
import InsertedImageNode, {
  type InsertedImageLike as InsertedImage,
} from "@/components/design-editor/InsertedImageNode";

import { useEditorState } from "@/components/design-editor/EditorStateContext";

// ===== Tipo da pilha unificada (baixo -> topo) =====
type StackItem = { kind: "shape" | "image"; id: string };

export default function Canvas() {
  // ---------- refs ----------
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // 🔹 viewport / zoom / pan
  const [viewport, setViewport] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // 🔹 estado global do editor
  const {
    shapes,
    images: insertedImages,
    stack,
    addShape,
    updateShape,
    removeShape,
    addImage,
    updateImage,
    removeImage,
    bringForward,
    sendBackward,
  } = useEditorState();

  // refs de nós
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});
  const imageRefs = useRef<Record<string, Konva.Node | null>>({});

  // refs auxiliares para cálculos sem re-render
  const shapesRef = useRef<AnyShape[]>([]);
  const insertedImagesRef = useRef<InsertedImage[]>([]);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);
  useEffect(() => {
    insertedImagesRef.current = insertedImages;
  }, [insertedImages]);

  // Artboard
  const { artboard } = useArtboard();

  // ✅ Selection — via contexto
  const { selection, actions: sel } = useSelectionContext();

  const selectedShapeIds = useMemo<string[]>(() => {
    if (!selection || selection.kind === "none") return [];
    if (selection.kind === "shape" || selection.kind === "text")
      return selection.ids;
    if (selection.kind === "mixed")
      return [...selection.shapeIds, ...(selection.textIds ?? [])];
    return [];
  }, [selection]);

  const selectedImageIds = useMemo<string[]>(() => {
    if (!selection || selection.kind === "none") return [];
    if (selection.kind === "image") return selection.ids;
    if (selection.kind === "mixed") return [...selection.imageIds];
    return [];
  }, [selection]);

  const hasAnySelection =
    selectedShapeIds.length > 0 || selectedImageIds.length > 0;

  // agenda mudanças de seleção para depois do render atual
  const scheduleSel = useCallback((fn: () => void) => {
    if (typeof queueMicrotask === "function") queueMicrotask(fn);
    else setTimeout(fn, 0);
  }, []);

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

  const applyCenterFromScale = useCallback(
    (s: number) => {
      const x = (viewport.width - artboard.width * s) / 2;
      const y = (viewport.height - artboard.height * s) / 2;
      setScale(s);
      setStagePos({ x, y });
    },
    [viewport.width, viewport.height, artboard.width, artboard.height]
  );

  useEffect(() => {
    applyCenterFromScale(fitScale);
  }, [fitScale, applyCenterFromScale]);

  // helpers coords: Stage -> espaço local (artboard)
  const stageToLocal = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - stagePos.x) / scale,
      y: (sy - stagePos.y) / scale,
    }),
    [stagePos.x, stagePos.y, scale]
  );

  // ===== Handlers de movimento individuais =====
  const handleMoveShape = useCallback(
    (id: string, x: number, y: number) => {
      updateShape(id, { x, y });
    },
    [updateShape]
  );

  const handleMoveImage = useCallback(
    (id: string, x: number, y: number) => {
      updateImage(id, { x, y });
    },
    [updateImage]
  );

  // ===== Inserir shape no ponto =====
  function addShapeAt(type: AnyShape["type"], sx: number, sy: number) {
    const rid = (p: string) => `${p}-${crypto.randomUUID().slice(0, 8)}`;
    const { x, y } = stageToLocal(sx, sy);

    const base = {
      x,
      y,
      rotation: 0,
      opacity: 1,
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      isHidden: false,
      isLocked: false,
    };

    let newShape: AnyShape;
    switch (type) {
      case "rect":
        newShape = {
          id: rid("rect"),
          type,
          name: "Retângulo",
          ...base,
          x: x - 70,
          y: y - 50,
          width: 140,
          height: 100,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
        } as any;
        break;
      case "circle":
        newShape = {
          id: rid("circle"),
          type,
          name: "Círculo",
          ...base,
          radius: 60,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
        } as any;
        break;
      case "triangle":
        newShape = {
          id: rid("triangle"),
          type,
          name: "Triângulo",
          ...base,
          radius: 70,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
        } as any;
        break;
      case "line":
        newShape = {
          id: rid("line"),
          type,
          name: "Linha",
          ...base,
          points: [-70, 0, 70, 0],
          stroke: DEFAULTS.line.stroke,
          strokeWidth: DEFAULTS.line.strokeWidth,
          opacity: DEFAULTS.line.opacity,
          lineCap: "round",
        } as any;
        break;
      case "star":
        newShape = {
          id: rid("star"),
          type,
          name: "Estrela",
          ...base,
          numPoints: 5,
          innerRadius: 30,
          outerRadius: 70,
          fill: DEFAULTS.fill,
          stroke: DEFAULTS.stroke,
          strokeWidth: DEFAULTS.strokeWidth,
        } as any;
        break;
      default:
        newShape = {
          id: rid("text"),
          type: "text",
          name: "Texto",
          ...base,
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
        } as any;
        break;
    }

    addShape(newShape, true);
    scheduleSel(() => sel.select("shape", newShape.id));
  }

  // ===== Receber patch vindo dos painéis (sem event-bus) =====
  // -> O painel agora chama updateShape via contexto diretamente.
  //    Mantemos este util só para patches de texto aplicados no Konva Node.
  const applyTextPatchLocalNode = useCallback(
    (id: string, patch: Partial<ShapeText>) => {
      const node = shapeRefs.current[id];
      if (isKonvaTextNode(node)) applyTextPatchToNode(node, patch);
    },
    []
  );

  // pan com espaço
  const isPanningRef = useRef(false);
  const spacePressedRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, stageX: 0, stageY: 0 });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputLike(e.target)) return;
      if (e.code === "Space") {
        spacePressedRef.current = true;
        document.body.style.cursor = "grab";
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isInputLike(e.target)) return;
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
      if (isInputLike(e.target)) return;

      if (e.key === "Escape") {
        scheduleSel(() => sel.clear());
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const imgIds = [...selectedImageIds];
        if (imgIds.length > 0) {
          e.preventDefault();
          for (const id of imgIds) removeImage(id);
          scheduleSel(() => sel.clear());
          return;
        }
        const ids = [...selectedShapeIds];
        if (!ids.length) return;
        e.preventDefault();
        for (const id of ids) removeShape(id);
        scheduleSel(() => sel.clear());
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    scheduleSel,
    sel,
    selectedImageIds,
    selectedShapeIds,
    removeImage,
    removeShape,
  ]);

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

  const beginMarquee = (lx: number, ly: number) => {
    setMarquee({ active: true, x1: lx, y1: ly, x2: lx, y2: ly });
    scheduleSel(() => sel.clear());
  };

  const updateMarquee = (lx: number, ly: number) => {
    setMarquee((m) => (m.active ? { ...m, x2: lx, y2: ly } : m));
  };

  const finishMarquee = () => {
    setMarquee((m) => {
      if (!m.active) return m;

      // retângulo em coordenadas locais (artboard)
      const xLocal = Math.min(m.x1, m.x2);
      const yLocal = Math.min(m.y1, m.y2);
      const wLocal = Math.abs(m.x2 - m.x1);
      const hLocal = Math.abs(m.y2 - m.y1);

      // clique curto: limpa e sai
      if (wLocal < 2 && hLocal < 2) {
        scheduleSel(() => sel.clear());
        requestAnimationFrame(() => stageRef.current?.batchDraw());
        return { active: false, x1: 0, y1: 0, x2: 0, y2: 0 };
      }

      // 🔄 local -> stage
      const aStage = {
        x: stagePos.x + xLocal * scale,
        y: stagePos.y + yLocal * scale,
        width: wLocal * scale,
        height: hLocal * scale,
      };

      const intersects = (
        A: { x: number; y: number; width: number; height: number },
        B: { x: number; y: number; width: number; height: number }
      ) =>
        A.x <= B.x + B.width &&
        A.x + A.width >= B.x &&
        A.y <= B.y + B.height &&
        A.y + A.height >= B.y;

      // 🔹 Shapes
      const shapeIdSet = new Set<string>();
      for (const s of shapesRef.current) {
        const node = shapeRefs.current[s.id] as Konva.Node | null;
        if (!node || (node as any).isDestroyed?.() || !node.getStage())
          continue;
        const bb = node.getClientRect();
        if (intersects(aStage, bb)) shapeIdSet.add(s.id);
      }
      const orderedShapeIds = shapesRef.current
        .filter((s) => shapeIdSet.has(s.id))
        .map((s) => s.id);

      // 🔹 Imagens
      const imageIds: string[] = [];
      for (const img of insertedImagesRef.current) {
        const node = imageRefs.current[img.id];
        if (!node || (node as any).isDestroyed?.() || !node.getStage())
          continue;
        const bb = node.getClientRect();
        if (intersects(aStage, bb)) imageIds.push(img.id);
      }

      scheduleSel(() => {
        if (imageIds.length && orderedShapeIds.length) {
          sel.replace({ kind: "mixed", shapeIds: orderedShapeIds, imageIds });
        } else if (imageIds.length) {
          sel.replace({ kind: "image", ids: imageIds });
        } else if (orderedShapeIds.length) {
          sel.replace({ kind: "shape", ids: orderedShapeIds });
        } else {
          sel.clear();
        }
      });

      requestAnimationFrame(() => stageRef.current?.batchDraw());
      return { active: false, x1: 0, y1: 0, x2: 0, y2: 0 };
    });
  };

  // zoom controls
  const handleChangeScale = (s: number) => applyCenterFromScale(s);
  const handleFit = () => applyCenterFromScale(fitScale);

  // ✅ Inserir imagem (EventBridge) no centro da artboard
  const handleInsertImage = useCallback(
    ({ url, path }: { url: string; path?: string }) => {
      const id = `img-${crypto.randomUUID().slice(0, 8)}`;

      // centro da artboard em coordenadas de STAGE
      const cx = stagePos.x + (artboard.width * scale) / 2;
      const cy = stagePos.y + (artboard.height * scale) / 2;

      // offset incremental para evitar sobreposição total
      const n = insertedImagesRef.current.length;
      const step = 24; // px em espaço LOCAL
      const oxLocal = (n % 5) * step;
      const oyLocal = (n % 5) * step;

      // local -> stage
      const sx = cx + oxLocal * scale;
      const sy = cy + oyLocal * scale;

      const { x, y } = stageToLocal(sx, sy);
      const pathSafe = path ?? "";

      addImage(
        {
          id,
          url,
          path: pathSafe,
          x,
          y,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          opacity: 1,
        },
        true
      );

      scheduleSel(() => sel.select("image", id));
    },
    [
      stagePos.x,
      stagePos.y,
      artboard.width,
      artboard.height,
      scale,
      stageToLocal,
      scheduleSel,
      sel,
      addImage,
    ]
  );

  // ===== Drag em grupo (multi-drag) =====
  const multiDragRef = useRef<{
    active: boolean;
    driverId: string | null;
    driverType: "shape" | "image" | null;
    driverStart: { x: number; y: number } | null;
    shapesStart: Record<string, { x: number; y: number }>;
    imagesStart: Record<string, { x: number; y: number }>;
  }>({
    active: false,
    driverId: null,
    driverType: null,
    driverStart: null,
    shapesStart: {},
    imagesStart: {},
  });

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const isNodeOneOf = (
      node: Konva.Node | null,
      targets: Array<Konva.Node | null>
    ) => {
      if (!node) return false;
      for (const t of targets) {
        if (!t) continue;
        let n: Konva.Node | null = node;
        while (n) {
          if (n === t) return true;
          n = n.getParent();
        }
      }
      return false;
    };

    const onDragStart = (e: Konva.KonvaEventObject<any>) => {
      if (selectedShapeIds.length + selectedImageIds.length <= 1) return;

      const driverNode = e.target as Konva.Node;

      const currentSelectedNodes: (Konva.Node | null)[] = [];
      for (const imgId of selectedImageIds)
        currentSelectedNodes.push(imageRefs.current[imgId] ?? null);
      for (const id of selectedShapeIds)
        currentSelectedNodes.push(shapeRefs.current[id] ?? null);

      if (!isNodeOneOf(driverNode, currentSelectedNodes)) return;

      // identificar driver
      let driverId: string | null = null;
      let driverType: "shape" | "image" | null = null;

      for (const imgId of selectedImageIds) {
        const imgNode = imageRefs.current[imgId] ?? null;
        if (isNodeOneOf(driverNode, [imgNode])) {
          driverId = imgId;
          driverType = "image";
          break;
        }
      }
      if (!driverId) {
        for (const sid of selectedShapeIds) {
          const sNode = shapeRefs.current[sid] ?? null;
          if (isNodeOneOf(driverNode, [sNode])) {
            driverId = sid;
            driverType = "shape";
            break;
          }
        }
      }
      if (!driverId || !driverType) return;

      // snapshot das posições iniciais
      const shapesStart: Record<string, { x: number; y: number }> = {};
      for (const sid of selectedShapeIds) {
        const s = shapesRef.current.find((sh) => sh.id === sid);
        if (s) shapesStart[sid] = { x: s.x, y: s.y };
      }

      const imagesStart: Record<string, { x: number; y: number }> = {};
      for (const imgId of selectedImageIds) {
        const img = insertedImagesRef.current.find((i) => i.id === imgId);
        if (img) imagesStart[img.id] = { x: img.x, y: img.y };
      }

      multiDragRef.current = {
        active: true,
        driverId,
        driverType,
        driverStart: { x: driverNode.x(), y: driverNode.y() },
        shapesStart,
        imagesStart,
      };
    };

    const onDragMove = (e: Konva.KonvaEventObject<any>) => {
      if (!multiDragRef.current.active) return;
      const driverNode = e.target as Konva.Node;

      const dx = driverNode.x() - (multiDragRef.current.driverStart?.x ?? 0);
      const dy = driverNode.y() - (multiDragRef.current.driverStart?.y ?? 0);

      // mover visualmente os outros nós (sem re-render a cada frame)
      Object.entries(multiDragRef.current.shapesStart).forEach(
        ([id, start]) => {
          if (
            multiDragRef.current.driverType === "shape" &&
            id === multiDragRef.current.driverId
          )
            return;
          const n = shapeRefs.current[id];
          if (n) n.position({ x: start.x + dx, y: start.y + dy });
        }
      );

      Object.entries(multiDragRef.current.imagesStart).forEach(
        ([id, start]) => {
          if (
            multiDragRef.current.driverType === "image" &&
            id === multiDragRef.current.driverId
          )
            return;
          const n = imageRefs.current[id];
          if (n) n.position({ x: start.x + dx, y: start.y + dy });
        }
      );

      stage.batchDraw();
    };

    const onDragEnd = (e: Konva.KonvaEventObject<any>) => {
      if (!multiDragRef.current.active) return;
      const driverNode = e.target as Konva.Node;

      const dx = driverNode.x() - (multiDragRef.current.driverStart?.x ?? 0);
      const dy = driverNode.y() - (multiDragRef.current.driverStart?.y ?? 0);

      // persistir no estado (um único re-render)
      for (const [id, start] of Object.entries(
        multiDragRef.current.shapesStart
      )) {
        updateShape(id, { x: start.x + dx, y: start.y + dy });
      }
      for (const [id, start] of Object.entries(
        multiDragRef.current.imagesStart
      )) {
        updateImage(id, { x: start.x + dx, y: start.y + dy });
      }

      multiDragRef.current.active = false;
    };

    stage.on("dragstart", onDragStart);
    stage.on("dragmove", onDragMove);
    stage.on("dragend", onDragEnd);

    return () => {
      stage.off("dragstart", onDragStart);
      stage.off("dragmove", onDragMove);
      stage.off("dragend", onDragEnd);
    };
  }, [selectedShapeIds, selectedImageIds, updateShape, updateImage]);

  // ===== Renderer de SHAPES (num único Layer) =====
  const ShapeNode = ({ s }: { s: AnyShape }) => {
    // seleção multi (shift/cmd/ctrl)
    const handleClick = useCallback(
      (evt: any) => {
        const multi = !!(
          evt?.evt?.shiftKey ||
          evt?.evt?.metaKey ||
          evt?.evt?.ctrlKey
        );
        scheduleSel(() => {
          if (multi) sel.toggle("shape", s.id);
          else sel.select("shape", s.id);
        });
        evt.cancelBubble = true;
      },
      [s.id, scheduleSel, sel]
    );

    const common = {
      x: s.x,
      y: s.y,
      rotation: s.rotation ?? 0,
      opacity: (s as any).opacity ?? 1,
      draggable: !s.isLocked,
      onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
        const node = e.target as Konva.Node;
        handleMoveShape(s.id, node.x(), node.y());
      },
      onMouseDown: handleClick,
      onTap: handleClick,
    };

    if (s.type === "text") {
      return (
        <KText
          ref={(n) => {
            shapeRefs.current[s.id] = n;
          }}
          {...common}
          text={(s as ShapeText).text}
          fontFamily={(s as ShapeText).fontFamily}
          fontSize={(s as ShapeText).fontSize}
          fontStyle={(s as ShapeText).fontStyle}
          align={(s as ShapeText).align as any}
          lineHeight={(s as ShapeText).lineHeight}
          letterSpacing={(s as ShapeText).letterSpacing}
          width={(s as ShapeText).width}
          height={(s as ShapeText).height}
          padding={(s as ShapeText).padding}
          fill={(s as ShapeText).fill}
          listening
        />
      );
    }

    return (
      <Group
        ref={(n) => {
          shapeRefs.current[s.id] = n;
        }}
        {...common}
        listening>
        {s.type === "rect" && (
          <Rect
            width={(s as ShapeRect).width}
            height={(s as ShapeRect).height}
            fill={(s as any).fill}
            stroke={(s as any).stroke}
            strokeWidth={(s as any).strokeWidth}
            shadowBlur={(s as any).shadowBlur}
            shadowOffsetX={(s as any).shadowOffsetX}
            shadowOffsetY={(s as any).shadowOffsetY}
          />
        )}

        {s.type === "circle" && (
          <Circle
            radius={(s as ShapeCircle).radius}
            fill={(s as any).fill}
            stroke={(s as any).stroke}
            strokeWidth={(s as any).strokeWidth}
            shadowBlur={(s as any).shadowBlur}
            shadowOffsetX={(s as any).shadowOffsetX}
            shadowOffsetY={(s as any).shadowOffsetY}
          />
        )}

        {s.type === "triangle" && (
          <RegularPolygon
            sides={3}
            radius={(s as ShapeTriangle).radius}
            fill={(s as any).fill}
            stroke={(s as any).stroke}
            strokeWidth={(s as any).strokeWidth}
            shadowBlur={(s as any).shadowBlur}
            shadowOffsetX={(s as any).shadowOffsetX}
            shadowOffsetY={(s as any).shadowOffsetY}
          />
        )}

        {s.type === "line" && (
          <Line
            points={(s as ShapeLine).points}
            stroke={(s as ShapeLine).stroke}
            strokeWidth={(s as ShapeLine).strokeWidth}
            lineCap={(s as ShapeLine).lineCap as any}
            opacity={(s as ShapeLine).opacity}
            shadowBlur={(s as any).shadowBlur}
            shadowOffsetX={(s as any).shadowOffsetX}
            shadowOffsetY={(s as any).shadowOffsetY}
          />
        )}

        {s.type === "star" && (
          <Star
            numPoints={(s as ShapeStar).numPoints}
            innerRadius={(s as ShapeStar).innerRadius}
            outerRadius={(s as ShapeStar).outerRadius}
            fill={(s as any).fill}
            stroke={(s as any).stroke}
            strokeWidth={(s as any).strokeWidth}
            shadowBlur={(s as any).shadowBlur}
            shadowOffsetX={(s as any).shadowOffsetX}
            shadowOffsetY={(s as any).shadowOffsetY}
          />
        )}
      </Group>
    );
  };

  // ===== Stage =====
  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      onMouseDown={onContainerMouseDown}
      onMouseMove={onContainerMouseMove}
      onMouseUp={onContainerMouseUp}
      onMouseLeave={onContainerMouseUp}>
      {/* Bridge: mantém compatibilidade com botões/atalhos externos */}
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

          addShapeAt(t as AnyShape["type"], sx, sy);
        }}
        onSelect={(id) => {
          if (!id) {
            scheduleSel(() => sel.clear());
            return;
          }
          const isShape = shapesRef.current.some((s) => s.id === id);
          const isImage = insertedImagesRef.current.some(
            (img) => img.id === id
          );

          if (isShape) scheduleSel(() => sel.select("shape", id));
          else if (isImage) scheduleSel(() => sel.select("image", id));
        }}
        onDelete={(id) => {
          if (id) {
            const isShape = shapesRef.current.some((s) => s.id === id);
            const isImage = insertedImagesRef.current.some(
              (img) => img.id === id
            );
            if (isShape) {
              removeShape(id);
              scheduleSel(() => sel.clear());
            } else if (isImage) {
              removeImage(id);
              scheduleSel(() => sel.clear());
            }
            return;
          }

          // sem id: limpa seleção atual
          if (selectedImageIds.length > 0) {
            for (const imgId of selectedImageIds) removeImage(imgId);
            scheduleSel(() => sel.clear());
            return;
          }

          if (selectedShapeIds.length > 0) {
            for (const sid of selectedShapeIds) removeShape(sid);
            scheduleSel(() => sel.clear());
          }
        }}
        onToggleHidden={(id) => {
          const s = shapesRef.current.find((sh) => sh.id === id);
          if (!s) return;
          updateShape(id, { isHidden: !s.isHidden });
        }}
        onToggleLocked={(id) => {
          const s = shapesRef.current.find((sh) => sh.id === id);
          if (!s) return;
          updateShape(id, { isLocked: !s.isLocked });
        }}
        onBringForward={(id) => bringForward(id)}
        onSendBackward={(id) => sendBackward(id)}
        onInsertImage={handleInsertImage}
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
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onMouseDown={(e: any) => {
          const target: Konva.Node = e.target;
          const stage = target.getStage();
          if (!stage) return;

          const isDescendantOfAny = (
            node: Konva.Node | null,
            list: Array<Konva.Node | null>
          ) => {
            if (!node) return false;
            for (const t of list) {
              if (!t) continue;
              let n: Konva.Node | null = node;
              while (n) {
                if (n === t) return true;
                n = n.getParent();
              }
            }
            return false;
          };

          const allInteractive = [
            ...Object.values(shapeRefs.current),
            ...Object.values(imageRefs.current),
          ];
          const clickedOnEmpty =
            target === stage || !isDescendantOfAny(target, allInteractive);

          if (
            e.evt?.button === 0 &&
            clickedOnEmpty &&
            !spacePressedRef.current
          ) {
            const p = stage.getPointerPosition();
            if (p) {
              const l = stageToLocal(p.x, p.y);
              beginMarquee(l.x, l.y);
            }
          }
        }}
        onMouseMove={(e: any) => {
          if (!marquee.active) return;
          const stage = e.target.getStage();
          if (!stage) return;
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
          const target: Konva.Node = e.target;
          const stage = target.getStage();
          if (!stage) return;

          const isDescendantOfAny = (
            node: Konva.Node | null,
            list: Array<Konva.Node | null>
          ) => {
            if (!node) return false;
            for (const t of list) {
              if (!t) continue;
              let n: Konva.Node | null = node;
              while (n) {
                if (n === t) return true;
                n = n.getParent();
              }
            }
            return false;
          };

          const allInteractive = [
            ...Object.values(shapeRefs.current),
            ...Object.values(imageRefs.current),
          ];
          const clickedOnEmpty =
            target === stage || !isDescendantOfAny(target, allInteractive);

          if (clickedOnEmpty) {
            scheduleSel(() => sel.clear());
          }
        }}>
        {/* 🔹 Artboard */}
        <ArtboardLayer
          artboard={{ width: artboard.width, height: artboard.height }}
          stageSize={viewport}
          pad={0}
        />

        {/* 🔹 Conteúdo unificado: RESPEITA A ORDEM DA PILHA */}
        <Layer name="UnifiedLayer">
          {stack.map((k) => {
            if (k.kind === "image") {
              const img = insertedImages.find((i) => i.id === k.id);
              if (!img) return <Fragment key={`void-${k.kind}-${k.id}`} />;
              return (
                <InsertedImageNode
                  key={`img-${img.id}`}
                  data={img}
                  selected={selectedImageIds.includes(img.id)}
                  onSelect={(id, multi) => {
                    scheduleSel(() => {
                      if (id) {
                        if (multi) sel.toggle("image", id);
                        else sel.select("image", id);
                      } else {
                        sel.clear();
                      }
                    });
                  }}
                  onMove={handleMoveImage}
                  onTransform={(id, patch) => updateImage(id, patch)}
                  registerRef={(id, node) => {
                    imageRefs.current[id] = node;
                  }}
                />
              );
            }

            const s = shapes.find((sh) => sh.id === k.id);
            if (!s || s.isHidden)
              return <Fragment key={`void-${k.kind}-${k.id}`} />;

            return <ShapeNode key={`shape-${s.id}`} s={s} />;
          })}
        </Layer>

        {/* 🔧 Overlay (Transformer + Marquee) */}
        {(hasAnySelection || marquee.active) && (
          <Layer name="OverlayLayer" listening={false}>
            {hasAnySelection && (
              <TransformerManager shapeRefs={shapeRefs} imageRefs={imageRefs} />
            )}
            <MarqueeOverlay marquee={marquee} />
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
