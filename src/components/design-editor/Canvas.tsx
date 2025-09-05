// src/components/design-editor/Canvas.tsx
"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import type Konva from "konva";
import EventBridge from "./EventBridge";
import DnDContainer from "./DnDContainer";
import ZoomControls from "./ZoomControls";
import SelectionTransformer from "./SelectionTransformer";
import ImagesLayer from "@/components/design-editor/layers/ImagesLayer";
import ShapesLayerWrapper from "@/components/design-editor/layers/ShapesLayerWrapper";
import TextLayer from "@/components/design-editor/layers/TextLayer";
import ShapesLayer from "@/components/design-editor/ShapesLayer";

import { Stage, Layer } from "react-konva";
import MarqueeOverlay from "@/components/design-editor/layers/MarqueeOverlay";

// 🔹 existentes
import { useSelectionSync } from "@/components/design-editor/hooks/useSelectionSync";
import {
  isKonvaTextNode,
  applyTextPatchToNode,
} from "@/components/design-editor/utils/konvaCache";

// 🔹 utils (guard de teclado unificado)
import { isInputLike } from "@/components/design-editor/utils/is-input-like";

// 🔹 artboard
import { useArtboard } from "@/hooks/design-editor/use-artboard";
import ArtboardLayer from "@/components/design-editor/ArtboardLayer";

import { DESIGN_DEFAULTS as DEFAULTS } from "@/components/design-editor/constants/design-defaults";
import {
  normalizeType,
  AnyShape,
  ShapeBase,
  ShapeRect,
  ShapeCircle,
  ShapeTriangle,
  ShapeLine,
  ShapeStar,
  ShapeText,
  isTextShapeStrict,
} from "@/components/design-editor/types/shapes";

// ✅ Selection Manager (base recém-adicionada)
import { useSelectionManager } from "@/hooks/design-editor/use-selection-manager";
import type { Selection } from "@/components/design-editor/types/selection";

// ========= Imagens inseridas =========
type InsertedImage = {
  id: string;
  url: string;
  path: string;
  x: number;
  y: number;
  scaleX?: number;
  scaleY?: number;
  rotation?: number;
};

export default function Canvas() {
  // ---------- refs ----------
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // 🔹 viewport
  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  // 🔹 zoom/posicionamento
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // shapes/seleção
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // 🔹 seleção de imagem
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});
  const selectedImageIdRef = useRef<string | null>(null);
  const selectedImageIdsRef = useRef<string[]>([]);
  const imageRefs = useRef<Record<string, Konva.Group | null>>({});

  // Artboard
  const { artboard } = useArtboard();

  // 🔹 imagens inseridas
  const [insertedImages, setInsertedImages] = useState<InsertedImage[]>([]);

  // 🔁 versions para forçar remount nos layers ao reordenar
  const [imagesVersion, setImagesVersion] = useState(0);
  const [shapesVersion, setShapesVersion] = useState(0);

  // ✅ Selection Manager — inicialização
  const sel = useSelectionManager();

  // ✅ Handlers para mover itens (com guarda para multi-drag)
  const handleMoveShape = (id: string, x: number, y: number) => {
    if (multiDragRef.current.active) return;
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const handleMoveImage = (id: string, x: number, y: number) => {
    if (multiDragRef.current.active) return;
    setInsertedImages((prev) =>
      prev.map((it) => (it.id === id ? { ...it, x, y } : it))
    );
  };

  // 🔧 helper: aplicar seleção unificada no estado legado (compat)
  const applySelectionToLegacy = useCallback((s: Selection) => {
    switch (s.kind) {
      case "none": {
        setSelectedIds([]);
        setSelectedId(null);
        setSelectedImageId(null);
        setSelectedImageIds([]);
        break;
      }
      case "image": {
        const last = s.ids.length ? s.ids[s.ids.length - 1] : null;
        setSelectedImageId(last);
        setSelectedImageIds(s.ids);
        setSelectedIds([]);
        setSelectedId(null);
        break;
      }
      case "shape":
      case "text": {
        const ids = s.ids;
        const last = ids.length ? ids[ids.length - 1] : null;
        setSelectedIds(ids);
        setSelectedId(last);
        setSelectedImageId(null);
        setSelectedImageIds([]);
        break;
      }
      case "mixed": {
        const shapeIds = [...s.shapeIds, ...(s.textIds ?? [])];
        const lastShape = shapeIds.length
          ? shapeIds[shapeIds.length - 1]
          : null;
        const lastImage = s.imageIds.length
          ? s.imageIds[s.imageIds.length - 1]
          : null;
        setSelectedIds(shapeIds);
        setSelectedId(lastShape);
        setSelectedImageId(lastImage);
        setSelectedImageIds(s.imageIds);
        break;
      }
    }
  }, []);

  // refs anti-stale
  const shapesRef = useRef<AnyShape[]>(shapes);
  const selectedRef = useRef<string | null>(selectedId);
  const selectedIdsRef = useRef<string[]>(selectedIds);
  const insertedImagesRef = useRef<InsertedImage[]>(insertedImages);

  useEffect(() => {
    shapesRef.current = shapes;
    selectedRef.current = selectedId;
    selectedIdsRef.current = selectedIds;
  }, [shapes, selectedId, selectedIds]);

  useEffect(() => {
    selectedImageIdRef.current = selectedImageId;
  }, [selectedImageId]);
  useEffect(() => {
    selectedImageIdsRef.current = selectedImageIds;
  }, [selectedImageIds]);

  useEffect(() => {
    insertedImagesRef.current = insertedImages;
  }, [insertedImages]);

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
  }, [artboard.width, artboard.height, fitScale]);

  // ========= Evento de estado p/ painel de camadas =========
  useEffect(() => {
    if (typeof window === "undefined") return;

    const filenameFromPath = (p?: string) => {
      if (!p) return "Imagem";
      const base = p.split("/").pop() || "Imagem";
      return base || "Imagem";
    };

    // z-order conforme render: ImagesLayer abaixo de ShapesLayer
    const imageItems = insertedImages.map((img, idx) => ({
      id: img.id,
      kind: "image" as const,
      type: "image" as const,
      name: filenameFromPath(img.path),
      isHidden: false,
      isLocked: false,
      z: idx,
      layer: "ImagesLayer" as const,
    }));

    const shapeItems = shapes.map((s, idx) => ({
      id: s.id,
      kind: "shape" as const,
      type: s.type,
      name: s.name,
      isHidden: !!s.isHidden,
      isLocked: !!s.isLocked,
      z: insertedImages.length + idx,
      layer: "ShapesLayer" as const,
    }));

    const items = [...imageItems, ...shapeItems];

    const selectedItemIds = [...selectedIds, ...selectedImageIds];

    const payload = {
      items,
      selectedItemIds,

      // 🔁 Legado
      selectedId,
      shapes: shapes.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        isHidden: !!s.isHidden,
        isLocked: !!s.isLocked,
      })),
      images: insertedImages.map((img) => ({
        id: img.id,
        type: "image" as const,
        name: filenameFromPath(img.path),
        isHidden: false,
        isLocked: false,
      })),
      selectedImageId,
      selectedImageIds,
    };

    window.dispatchEvent(
      new CustomEvent("design-editor:state", { detail: payload })
    );
  }, [
    shapes,
    selectedId,
    selectedIds,
    insertedImages,
    selectedImageId,
    selectedImageIds,
  ]);

  // sincroniza propriedades da seleção (usa selectedId como primário)
  useSelectionSync({
    selectedId,
    shapes,
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

    // ✅ Seleção via manager (compat com legado)
    sel.select("shape", newShape.id);
    applySelectionToLegacy(sel.get());
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

  // pan com espaço (com guard unificado)
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

  // delete/esc — PRIORIDADE: imagens selecionadas; senão, shapes (guard unificado)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isInputLike(e.target)) return;

      if (e.key === "Escape") {
        sel.clear();
        applySelectionToLegacy(sel.get());
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        const imgIds = selectedImageIdsRef.current;
        if (imgIds.length > 0) {
          e.preventDefault();
          setInsertedImages((prev) =>
            prev.filter((it) => !imgIds.includes(it.id))
          );
          sel.clear();
          applySelectionToLegacy(sel.get());
          return;
        }
        const ids = selectedIdsRef.current;
        if (!ids.length) return;
        e.preventDefault();
        setShapes((prev) => prev.filter((s) => !ids.includes(s.id)));
        sel.clear();
        applySelectionToLegacy(sel.get());
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applySelectionToLegacy, sel]);

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
    sel.clear();
    applySelectionToLegacy(sel.get());
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
        sel.clear();
        applySelectionToLegacy(sel.get());
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

      // 🔹 Shapes (ordem consistente)
      const shapeIdSet = new Set<string>();
      for (const s of shapesRef.current) {
        const node = shapeRefs.current[s.id] as Konva.Node | null;
        if (!node || (node as any).isDestroyed?.() || !node.getStage())
          continue;
        const bb = node.getClientRect(); // stage space
        if (intersects(aStage, bb)) shapeIdSet.add(s.id);
      }
      const orderedShapeIds = shapesRef.current
        .filter((s) => shapeIdSet.has(s.id))
        .map((s) => s.id);

      // 🔹 Imagens — agora pega TODAS
      const imageIds: string[] = [];
      for (const img of insertedImagesRef.current) {
        const node = imageRefs.current[img.id];
        if (!node || (node as any).isDestroyed?.() || !node.getStage())
          continue;
        const bb = node.getClientRect(); // stage space
        if (intersects(aStage, bb)) imageIds.push(img.id);
      }

      // 🎯 Seleção (agora sem “apenas a última”)
      if (imageIds.length && orderedShapeIds.length) {
        sel.replace({
          kind: "mixed",
          shapeIds: orderedShapeIds,
          imageIds,
        });
      } else if (imageIds.length) {
        sel.replace({ kind: "image", ids: imageIds });
      } else {
        if (orderedShapeIds.length) {
          sel.replace({ kind: "shape", ids: orderedShapeIds });
        } else {
          sel.clear();
        }
      }

      applySelectionToLegacy(sel.get());
      return { active: false, x1: 0, y1: 0, x2: 0, y2: 0 };
    });
  };

  // zoom controls
  const handleChangeScale = (s: number) => applyCenterFromScale(s);
  const handleFit = () => applyCenterFromScale(fitScale);

  // ✅ Inserir imagem recebida do EventBridge no centro da artboard
  const handleInsertImage = useCallback(
    ({ url, path }: { url: string; path?: string }) => {
      const id = `img-${crypto.randomUUID().slice(0, 8)}`;

      // centro da artboard em coordenadas de STAGE
      const cx = stagePos.x + (artboard.width * scale) / 2;
      const cy = stagePos.y + (artboard.height * scale) / 2;

      // 🔸 offset incremental para evitar sobreposição total
      const n = insertedImagesRef.current.length;
      const step = 24; // px em espaço LOCAL
      const oxLocal = (n % 5) * step;
      const oyLocal = (n % 5) * step;

      // converter offset local -> stage antes de chamar stageToLocal
      const sx = cx + oxLocal * scale;
      const sy = cy + oyLocal * scale;

      const { x, y } = stageToLocal(sx, sy);

      const pathSafe = path ?? "";

      setInsertedImages((prev) => [
        ...prev,
        { id, url, path: pathSafe, x, y, scaleX: 1, scaleY: 1, rotation: 0 },
      ]);

      sel.select("image", id);
      applySelectionToLegacy(sel.get());
    },
    [
      stagePos.x,
      stagePos.y,
      artboard.width,
      artboard.height,
      scale,
      sel,
      applySelectionToLegacy,
    ]
  );

  // ===== Seleção combinada (para transformer unificado) =====
  const selectedNodes = useMemo(() => {
    const nodes: (Konva.Node | null)[] = [];
    for (const id of selectedImageIds)
      nodes.push(imageRefs.current[id] ?? null);
    for (const id of selectedIds) nodes.push(shapeRefs.current[id] ?? null);
    return nodes.filter(Boolean) as Konva.Node[];
  }, [selectedIds, selectedImageIds]);

  const hasMixedSelection =
    selectedIds.length > 0 && selectedImageIds.length > 0;
  const hasOnlyShapes = selectedIds.length > 0 && selectedImageIds.length === 0;

  // 🔎 Seleção somente de textos
  const hasOnlyTextSelection = useMemo(() => {
    if (selectedImageIds.length > 0 || selectedIds.length === 0) return false;
    for (const id of selectedIds) {
      const s = shapesRef.current.find((sh) => sh.id === id);
      if (!s || s.type !== "text") return false;
    }
    return true;
  }, [selectedIds, selectedImageIds]);

  // ===== Multi-drag (arrastar grupo) =====
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
      // só entra no multi-drag se houver mais de 1 selecionado
      if (
        selectedIdsRef.current.length + selectedImageIdsRef.current.length <=
        1
      )
        return;

      const driverNode = e.target as Konva.Node;

      const currentSelectedNodes: (Konva.Node | null)[] = [];
      for (const imgId of selectedImageIdsRef.current) {
        currentSelectedNodes.push(imageRefs.current[imgId] ?? null);
      }
      for (const id of selectedIdsRef.current)
        currentSelectedNodes.push(shapeRefs.current[id] ?? null);

      if (!isNodeOneOf(driverNode, currentSelectedNodes)) return;

      // identificar driver
      let driverId: string | null = null;
      let driverType: "shape" | "image" | null = null;

      for (const imgId of selectedImageIdsRef.current) {
        const imgNode = imageRefs.current[imgId] ?? null;
        if (isNodeOneOf(driverNode, [imgNode])) {
          driverId = imgId;
          driverType = "image";
          break;
        }
      }
      if (!driverId) {
        for (const sid of selectedIdsRef.current) {
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
      for (const sid of selectedIdsRef.current) {
        const s = shapesRef.current.find((sh) => sh.id === sid);
        if (s) shapesStart[sid] = { x: s.x, y: s.y };
      }

      const imagesStart: Record<string, { x: number; y: number }> = {};
      for (const imgId of selectedImageIdsRef.current) {
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
      setShapes((prev) =>
        prev.map((s) => {
          const start = multiDragRef.current.shapesStart[s.id];
          return start ? { ...s, x: start.x + dx, y: start.y + dy } : s;
        })
      );
      setInsertedImages((prev) =>
        prev.map((img) => {
          const start = multiDragRef.current.imagesStart[img.id];
          return start ? { ...img, x: start.x + dx, y: start.y + dy } : img;
        })
      );

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
  }, []);

  // ===== Apenas textos (derivado de shapes) =====
  const textShapes = useMemo(() => shapes.filter(isTextShapeStrict), [shapes]);

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

          addShapeAt(t as AnyShape["type"], sx, sy);
        }}
        onSelect={(id) => {
          if (!id) {
            sel.clear();
            applySelectionToLegacy(sel.get());
            return;
          }
          const isShape = shapesRef.current.some((s) => s.id === id);
          const isImage = insertedImagesRef.current.some(
            (img) => img.id === id
          );

          if (isShape) {
            sel.select("shape", id);
            applySelectionToLegacy(sel.get());
            return;
          }
          if (isImage) {
            sel.select("image", id);
            applySelectionToLegacy(sel.get());
            return;
          }
        }}
        onDelete={(id) => {
          // suporta deletar shapes e imagens
          if (id) {
            const isShape = shapesRef.current.some((s) => s.id === id);
            const isImage = insertedImagesRef.current.some(
              (img) => img.id === id
            );
            if (isShape) {
              setShapes((prev) => prev.filter((s) => s.id !== id));
              sel.clear();
              applySelectionToLegacy(sel.get());
            } else if (isImage) {
              setInsertedImages((prev) => prev.filter((img) => img.id !== id));
              sel.clear();
              applySelectionToLegacy(sel.get());
            }
            return;
          }

          // sem id: deleta toda a seleção atual
          const imgIds = selectedImageIdsRef.current;
          if (imgIds.length > 0) {
            setInsertedImages((prev) =>
              prev.filter((img) => !imgIds.includes(img.id))
            );
            sel.clear();
            applySelectionToLegacy(sel.get());
            return;
          }

          const targetIds = selectedIdsRef.current;
          if (!targetIds.length) return;
          setShapes((prev) => prev.filter((s) => !targetIds.includes(s.id)));
          sel.clear();
          applySelectionToLegacy(sel.get());
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
          let bumpedShape = false;
          setShapes((prev) => {
            const idx = prev.findIndex((s) => s.id === id);
            if (idx === -1 || idx === prev.length - 1) return prev;
            const copy = [...prev];
            [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
            bumpedShape = true;
            return copy;
          });
          if (bumpedShape) setShapesVersion((v) => v + 1);

          let bumpedImage = false;
          setInsertedImages((prev) => {
            const idx = prev.findIndex((img) => img.id === id);
            if (idx === -1 || idx === prev.length - 1) return prev;
            const copy = [...prev];
            [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
            bumpedImage = true;
            return copy;
          });
          if (bumpedImage) setImagesVersion((v) => v + 1);
        }}
        onSendBackward={(id) => {
          let bumpedShape = false;
          setShapes((prev) => {
            const idx = prev.findIndex((s) => s.id === id);
            if (idx === -1 || idx === 0) return prev;
            const copy = [...prev];
            [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
            bumpedShape = true;
            return copy;
          });
          if (bumpedShape) setShapesVersion((v) => v + 1);

          let bumpedImage = false;
          setInsertedImages((prev) => {
            const idx = prev.findIndex((img) => img.id === id);
            if (idx === -1 || idx === 0) return prev;
            const copy = [...prev];
            [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
            bumpedImage = true;
            return copy;
          });
          if (bumpedImage) setImagesVersion((v) => v + 1);
        }}
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
        // zoom/posicionamento
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onMouseDown={(e: any) => {
          // Só inicia marquee/deseleção se: clique ESQUERDO, em área vazia e sem “space”.
          const clickedOnEmpty = e.target === e.target.getStage();
          if (
            e.evt?.button === 0 &&
            clickedOnEmpty &&
            !spacePressedRef.current
          ) {
            const stage: Konva.Stage = e.target.getStage();
            const p = stage.getPointerPosition();
            if (p) {
              const l = stageToLocal(p.x, p.y);
              beginMarquee(l.x, l.y);
            }
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
            sel.clear();
            applySelectionToLegacy(sel.get());
          }
        }}>
        {/* 🔹 Artboard na ORIGEM (0,0) */}
        <ArtboardLayer
          artboard={{ width: artboard.width, height: artboard.height }}
          stageSize={viewport}
          pad={0}
        />

        {/* ✅ Layer de imagens (abaixo dos shapes) */}
        <ImagesLayer
          key={`images-${imagesVersion}`}
          images={insertedImages}
          // evita dois transformers quando a seleção é mista
          selectedImageIds={hasMixedSelection ? [] : selectedImageIds}
          onSelectImage={(id, multi) => {
            if (id) {
              if (multi) sel.toggle("image", id);
              else sel.select("image", id);
            } else {
              sel.clear();
            }
            applySelectionToLegacy(sel.get());
          }}
          onMoveImage={handleMoveImage}
          onTransformImage={(id, patch) =>
            setInsertedImages((prev) =>
              prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
            )
          }
          imageRefs={imageRefs}
        />

        {/* 🔹 Shapes SEM textos (wrapper novo) */}
        <ShapesLayerWrapper
          key={`shapes-${shapesVersion}`} // chave única
          shapes={shapes}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onSelectShape={(id, multi) => {
            if (id) {
              if (multi) sel.toggle("shape", id);
              else sel.select("shape", id);
            } else {
              sel.clear();
            }
            applySelectionToLegacy(sel.get());
          }}
          onMoveShape={handleMoveShape}
          shapeRefs={shapeRefs}
          canvasHeight={viewport.height}
          showTransformer={hasOnlyShapes}
          renderTexts={false}
        />

        {/* 📝 Textos (em layer dedicada, acima dos shapes) */}
        <TextLayer name="TextLayer" key={`text-${shapesVersion}`}>
          <ShapesLayer
            shapes={textShapes}
            selectedId={selectedId}
            onSelectShape={(id, multi) => {
              if (id) {
                if (multi) sel.toggle("shape", id);
                else sel.select("shape", id);
              } else {
                sel.clear();
              }
              applySelectionToLegacy(sel.get());
            }}
            onMoveShape={handleMoveShape}
            shapeRefs={shapeRefs}
          />
        </TextLayer>

        {/* 🔧 Transformer para seleção SOMENTE de textos */}
        {hasOnlyTextSelection && selectedNodes.length > 0 && (
          <Layer name="TextTransformerLayer">
            <SelectionTransformer
              selectedNodes={selectedNodes}
              getOptionsForSelection={() => ({
                keepRatio: false,
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
              })}
            />
          </Layer>
        )}

        {/* 🔧 Transformer UNIFICADO (seleção mista) */}
        {hasMixedSelection && selectedNodes.length > 0 && (
          <Layer name="UnifiedTransformerLayer">
            <SelectionTransformer
              selectedNodes={selectedNodes}
              getOptionsForSelection={() => ({
                keepRatio: false,
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
              })}
            />
          </Layer>
        )}

        <MarqueeOverlay marquee={marquee} />
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
