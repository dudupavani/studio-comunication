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
import { useSelectionSync } from "@/components/design-editor/hooks/useSelectionSync";
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
  ShapeBase,
  ShapeRect,
  ShapeCircle,
  ShapeTriangle,
  ShapeLine,
  ShapeStar,
  ShapeText,
  isTextShapeStrict,
} from "@/components/design-editor/types/shapes";

import { useSelectionContext } from "@/components/design-editor/SelectionContext";
import type { Selection } from "@/components/design-editor/types/selection";

import InsertedImageNode, {
  type InsertedImageLike as InsertedImage,
} from "@/components/design-editor/InsertedImageNode";

// ===== Tipo da pilha unificada (baixo -> topo) =====
type StackItem = { kind: "shape" | "image"; id: string };

export default function Canvas() {
  // ---------- refs ----------
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  // 🔹 viewport
  const [viewport, setViewport] = useState({ width: 800, height: 600 });

  // 🔹 zoom/posicionamento
  const [scale, setScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });

  // shapes/seleção (legado)
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // imagens
  const [insertedImages, setInsertedImages] = useState<InsertedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  // 🔹 pilha unificada (baixo -> topo)
  const [stack, setStack] = useState<StackItem[]>([]);

  // refs de nós
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});
  const imageRefs = useRef<Record<string, Konva.Group | null>>({});

  // refs auxiliares
  const shapesRef = useRef<AnyShape[]>([]);
  const insertedImagesRef = useRef<InsertedImage[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const selectedImageIdsRef = useRef<string[]>([]);
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    shapesRef.current = shapes;
  }, [shapes]);

  useEffect(() => {
    insertedImagesRef.current = insertedImages;
  }, [insertedImages]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
    selectedRef.current = selectedId;
  }, [selectedIds, selectedId]);

  useEffect(() => {
    selectedImageIdsRef.current = selectedImageIds;
  }, [selectedImageIds]);

  // Artboard
  const { artboard } = useArtboard();

  // ✅ Selection Manager — via contexto
  const { selection, actions } = useSelectionContext();
  const sel = useMemo(
    () => ({
      select: actions.select,
      toggle: actions.toggle,
      replace: actions.replace,
      clear: actions.clear,
    }),
    [actions.select, actions.toggle, actions.replace, actions.clear]
  );

  // agenda mudanças de seleção para depois do render atual
  const scheduleSel = useCallback((fn: () => void) => {
    if (typeof queueMicrotask === "function") queueMicrotask(fn);
    else setTimeout(fn, 0);
  }, []);

  // 🔧 espelha seleção no estado legado (compat)
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

  useEffect(() => {
    applySelectionToLegacy(selection);
  }, [selection, applySelectionToLegacy]);

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

  // ========= Mantém a pilha unificada em sincronia com shapes/imagens =========
  useEffect(() => {
    setStack((prev) => {
      const have = new Set(prev.map((k) => `${k.kind}:${k.id}`));
      let changed = false;
      const next = [...prev];

      // adiciona faltantes (na ponta TOP)
      for (const img of insertedImages) {
        const key = `image:${img.id}`;
        if (!have.has(key)) {
          next.push({ kind: "image", id: img.id });
          changed = true;
        }
      }
      for (const s of shapes) {
        const key = `shape:${s.id}`;
        if (!have.has(key)) {
          next.push({ kind: "shape", id: s.id });
          changed = true;
        }
      }

      // remove ids que não existem mais
      const alive = new Set([
        ...insertedImages.map((i) => `image:${i.id}`),
        ...shapes.map((s) => `shape:${s.id}`),
      ]);
      const filtered = next.filter((k) =>
        alive.has(`${k.kind}:${k.id}`)
      ) as StackItem[];

      if (filtered.length !== prev.length || changed) return filtered;
      return prev;
    });
  }, [insertedImages, shapes]);

  // ========= Evento de estado p/ painel de camadas =========
  useEffect(() => {
    if (typeof window === "undefined") return;

    const filenameFromPath = (p?: string) => {
      if (!p) return "Imagem";
      const base = p.split("/").pop() || "Imagem";
      return base || "Imagem";
    };

    // mapeia stack -> itens com z (index é o z real; maior = topo)
    const items = stack.map((k, idx) => {
      if (k.kind === "image") {
        const img = insertedImages.find((i) => i.id === k.id);
        return {
          id: k.id,
          kind: "image" as const,
          type: "image" as const,
          name: filenameFromPath(img?.path),
          isHidden: false,
          isLocked: false,
          z: idx,
          layer: "UnifiedLayer" as const,
        };
      }
      const s = shapes.find((x) => x.id === k.id);
      return {
        id: k.id,
        kind: "shape" as const,
        type: s?.type ?? "rect",
        name: s?.name,
        isHidden: !!s?.isHidden,
        isLocked: !!s?.isLocked,
        z: idx,
        layer: "UnifiedLayer" as const,
      };
    });

    const selectedItemIds = [...selectedIds, ...selectedImageIds];

    const payload = {
      items,
      selectedItemIds,
      selection,
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
    selection,
    stack,
  ]);

  // sincroniza propriedades da seleção (usa selectedId como primário)
  useSelectionSync({ selectedId, shapes });

  // helpers coords: Stage -> espaço local (artboard)
  const stageToLocal = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - stagePos.x) / scale,
      y: (sy - stagePos.y) / scale,
    }),
    [stagePos.x, stagePos.y, scale]
  );

  // ===== Handlers de movimento individuais =====
  const handleMoveShape = useCallback((id: string, x: number, y: number) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  }, []);

  const handleMoveImage = useCallback((id: string, x: number, y: number) => {
    setInsertedImages((prev) =>
      prev.map((it) => (it.id === id ? { ...it, x, y } : it))
    );
  }, []);

  // ===== Inserir shape no ponto =====
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
    // coloca no topo da pilha
    setStack((prev) => [...prev, { kind: "shape", id: newShape.id }]);
    scheduleSel(() => sel.select("shape", newShape.id));
  }

  // update props (patch vindo de painéis)
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
              if (isKonvaTextNode(node)) applyTextPatchToNode(node, pt);
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
        const imgIds = selectedImageIdsRef.current;
        if (imgIds.length > 0) {
          e.preventDefault();
          setInsertedImages((prev) =>
            prev.filter((it) => !imgIds.includes(it.id))
          );
          setStack((prev) =>
            prev.filter((k) => !(k.kind === "image" && imgIds.includes(k.id)))
          );
          scheduleSel(() => sel.clear());
          return;
        }
        const ids = selectedIdsRef.current;
        if (!ids.length) return;
        e.preventDefault();
        setShapes((prev) => prev.filter((s) => !ids.includes(s.id)));
        setStack((prev) =>
          prev.filter((k) => !(k.kind === "shape" && ids.includes(k.id)))
        );
        scheduleSel(() => sel.clear());
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scheduleSel, sel]);

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

  // ✅ Inserir imagem recebida do EventBridge no centro da artboard
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

      setInsertedImages((prev) => [
        ...prev,
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
      ]);

      setStack((prev) => [...prev, { kind: "image", id }]);
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
    ]
  );

  // ===== Derivados de seleção (nós Konva) =====
  const selectedNodes = useMemo(() => {
    const nodes: (Konva.Node | null)[] = [];
    for (const id of selectedImageIds)
      nodes.push(imageRefs.current[id] ?? null);
    for (const id of selectedIds) nodes.push(shapeRefs.current[id] ?? null);
    return nodes.filter(Boolean) as Konva.Node[];
  }, [selectedIds, selectedImageIds]);

  const hasOnlyImages = selectedImageIds.length > 0 && selectedIds.length === 0;

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

  // ===== Handlers de reordenação (um passo) na pilha =====
  const bringForwardInStack = (id: string) => {
    setStack((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const copy = [...prev];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy;
    });
  };

  const sendBackwardInStack = (id: string) => {
    setStack((prev) => {
      const idx = prev.findIndex((k) => k.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
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
            scheduleSel(() => sel.clear());
            return;
          }
          const isShape = shapesRef.current.some((s) => s.id === id);
          const isImage = insertedImagesRef.current.some(
            (img) => img.id === id
          );

          if (isShape) {
            scheduleSel(() => sel.select("shape", id));
            return;
          }
          if (isImage) {
            scheduleSel(() => sel.select("image", id));
            return;
          }
        }}
        onDelete={(id) => {
          if (id) {
            const isShape = shapesRef.current.some((s) => s.id === id);
            const isImage = insertedImagesRef.current.some(
              (img) => img.id === id
            );
            if (isShape) {
              setShapes((prev) => prev.filter((s) => s.id !== id));
              setStack((prev) =>
                prev.filter((k) => !(k.kind === "shape" && k.id === id))
              );
              scheduleSel(() => sel.clear());
            } else if (isImage) {
              setInsertedImages((prev) => prev.filter((img) => img.id !== id));
              setStack((prev) =>
                prev.filter((k) => !(k.kind === "image" && k.id === id))
              );
              scheduleSel(() => sel.clear());
            }
            return;
          }

          // sem id: deleta toda a seleção atual
          const imgIds = selectedImageIdsRef.current;
          if (imgIds.length > 0) {
            setInsertedImages((prev) =>
              prev.filter((img) => !imgIds.includes(img.id))
            );
            setStack((prev) =>
              prev.filter((k) => !(k.kind === "image" && imgIds.includes(k.id)))
            );
            scheduleSel(() => sel.clear());
            return;
          }

          const targetIds = selectedIdsRef.current;
          if (!targetIds.length) return;
          setShapes((prev) => prev.filter((s) => !targetIds.includes(s.id)));
          setStack((prev) =>
            prev.filter(
              (k) => !(k.kind === "shape" && targetIds.includes(k.id))
            )
          );
          scheduleSel(() => sel.clear());
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
        onBringForward={(id) => bringForwardInStack(id)}
        onSendBackward={(id) => sendBackwardInStack(id)}
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
                  onTransform={(id, patch) =>
                    setInsertedImages((prev) =>
                      prev.map((it) =>
                        it.id === id ? { ...it, ...patch } : it
                      )
                    )
                  }
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
        {(selectedNodes.length > 0 || marquee.active) && (
          <Layer name="OverlayLayer" listening={false}>
            {selectedNodes.length > 0 && (
              <TransformerManager
                selectedNodes={selectedNodes}
                hasOnlyImages={hasOnlyImages}
              />
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
