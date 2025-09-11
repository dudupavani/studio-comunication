"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  Stage,
  Layer,
  Rect,
  Text as KText,
  Transformer,
  Image as KonvaImage,
} from "react-konva";
import type Konva from "konva";

export default function Canvas() {
  // ---- Refs principais
  const stageRef = useRef<Konva.Stage | null>(null);
  const trRef = useRef<Konva.Transformer | null>(null);

  // Refs individuais (para atualizações visuais durante o drag sem re-render)
  const rectNodeRef = useRef<Konva.Rect | null>(null);
  const textNodeRef = useRef<Konva.Text | null>(null);
  const imageNodeRef = useRef<Konva.Image | null>(null);

  // ---- Estado dos nós
  const [rect, setRect] = useState({
    id: "rect-1",
    x: 120,
    y: 120,
    width: 180,
    height: 120,
    rotation: 0,
    fill: "#ef4444",
  });

  const [text, setText] = useState({
    id: "text-1",
    x: 360,
    y: 180,
    width: 220,
    rotation: 0,
    text: "Texto",
    fontSize: 28,
    fontFamily: "Inter, system-ui, sans-serif",
    fill: "#111827",
    align: "left" as const,
  });

  const [image, setImage] = useState({
    id: "img-1",
    x: 560,
    y: 160,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
  });
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);

  // ---- Imagem embutida (CORS-safe)
  const IMG_DATA_URL = (() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120">
      <rect x="0" y="0" width="160" height="120" rx="12" ry="12" fill="#10b981"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
            font-family="Inter, system-ui, sans-serif" font-size="28" fill="#062f2a">IMG</text>
    </svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  })();

  const TRANSPARENT_1PX =
    "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";

  useEffect(() => {
    let cancelled = false;
    const el = new window.Image();
    el.onload = () => !cancelled && setImgEl(el);
    el.src = IMG_DATA_URL;
    return () => {
      cancelled = true;
    };
  }, [IMG_DATA_URL]);

  const imageToUse: HTMLImageElement =
    imgEl ??
    (() => {
      const ph = new window.Image();
      ph.src = TRANSPARENT_1PX;
      return ph;
    })();

  // ---- Seleção (ids)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  const isMultiKey = (evt: any) =>
    !!(evt?.evt?.shiftKey || evt?.evt?.metaKey || evt?.evt?.ctrlKey); // <- corrigido

  // 🔧 helper: atualiza estado + ref SINCRONAMENTE
  const setSelectionSync = useCallback(
    (compute: (prev: string[]) => string[]) => {
      setSelectedIds((prev) => {
        const next = compute(prev);
        selectedIdsRef.current = next;
        return next;
      });
    },
    []
  );

  const clearSelection = useCallback(() => {
    selectedIdsRef.current = [];
    setSelectedIds([]);
  }, []);

  const selectId = useCallback(
    (id: string, multi: boolean) => {
      setSelectionSync((prev) => {
        if (!multi) return [id];
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      });
    },
    [setSelectionSync]
  );

  // ---- Clique “vazio” → limpa
  const onStageMouseDown = useCallback(
    (e: any) => {
      const stage = e.target.getStage();
      const clickedOnEmpty = e.target === stage;
      if (clickedOnEmpty) clearSelection();
    },
    [clearSelection]
  );

  // ---- Clique nos nós (com suporte a Shift) — SINCRONIZA antes do dragstart
  const onRectMouseDown = useCallback(
    (evt: any) => {
      if (selectedIdsRef.current.includes(rect.id)) {
        // já está selecionado → não altera seleção, só deixa arrastar
        return;
      }
      selectId(rect.id, isMultiKey(evt));
      evt.cancelBubble = true;
    },
    [rect.id, selectId]
  );

  const onTextMouseDown = useCallback(
    (evt: any) => {
      if (selectedIdsRef.current.includes(text.id)) {
        return;
      }
      selectId(text.id, isMultiKey(evt));
      evt.cancelBubble = true;
    },
    [text.id, selectId]
  );

  const onImageMouseDown = useCallback(
    (evt: any) => {
      if (selectedIdsRef.current.includes(image.id)) {
        return;
      }
      selectId(image.id, isMultiKey(evt));
      evt.cancelBubble = true;
    },
    [image.id, selectId]
  );

  // ---- Persistência de transform por nó (resize/rotate)
  const onRectTransformEnd = useCallback(() => {
    const stage = stageRef.current;
    const node = stage?.findOne<Konva.Rect>("#rect-1");
    if (!node) return;
    const sx = node.scaleX();
    const sy = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    setRect((r) => ({
      ...r,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(10, node.width() * sx),
      height: Math.max(10, node.height() * sy),
    }));
  }, []);

  const onTextTransformEnd = useCallback(() => {
    const stage = stageRef.current;
    const node = stage?.findOne<Konva.Text>("#text-1");
    if (!node) return;
    const sx = node.scaleX();
    node.scaleX(1);
    node.scaleY(1);
    setText((t) => ({
      ...t,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      width: Math.max(20, node.width() * sx),
    }));
  }, []);

  const onImageTransformEnd = useCallback(() => {
    const stage = stageRef.current;
    const node = stage?.findOne<Konva.Image>("#img-1");
    if (!node) return;
    setImage((im) => ({
      ...im,
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: node.scaleX(),
      scaleY: node.scaleY(),
    }));
  }, []);

  // ---- Multi-drag (arraste em grupo) — centralizado no Stage
  const multiDrag = useRef<{
    active: boolean;
    driverId: string | null;
    driverStart: { x: number; y: number } | null;
    starts: Record<string, { x: number; y: number }>;
  }>({
    active: false,
    driverId: null,
    driverStart: null,
    starts: {},
  });

  const getNodeRefById = (id: string): Konva.Node | null => {
    if (id === rect.id) return rectNodeRef.current;
    if (id === text.id) return textNodeRef.current;
    if (id === image.id) return imageNodeRef.current;
    return null;
  };

  const getIdFromTarget = (t: Konva.Node | null): string | null => {
    const id = t?.id?.();
    return typeof id === "string" && id ? id : null;
  };

  const onStageDragStart = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const driver = e.target as Konva.Node;
      const driverId = getIdFromTarget(driver);
      if (!driverId) {
        multiDrag.current.active = false;
        return;
      }

      const selected = selectedIdsRef.current; // já sincronizado nos mousedown handlers
      if (!selected.includes(driverId) || selected.length <= 1) {
        // não é multi-drag
        multiDrag.current.active = false;
        multiDrag.current.driverId = null;
        multiDrag.current.driverStart = null;
        multiDrag.current.starts = {};
        return;
      }

      multiDrag.current.active = true;
      multiDrag.current.driverId = driverId;
      multiDrag.current.driverStart = { x: driver.x(), y: driver.y() };

      const starts: Record<string, { x: number; y: number }> = {};
      selected.forEach((id) => {
        const n = getNodeRefById(id);
        if (n) starts[id] = { x: n.x(), y: n.y() };
      });
      multiDrag.current.starts = starts;
    },
    []
  );

  const onStageDragMove = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      if (!multiDrag.current.active || !multiDrag.current.driverStart) return;

      const driver = e.target as Konva.Node;
      const dx = driver.x() - multiDrag.current.driverStart.x;
      const dy = driver.y() - multiDrag.current.driverStart.y;

      Object.entries(multiDrag.current.starts).forEach(([id, start]) => {
        if (id === multiDrag.current.driverId) return;
        const n = getNodeRefById(id);
        if (n) n.position({ x: start.x + dx, y: start.y + dy });
      });

      // atualiza transformer/desenho
      trRef.current?.forceUpdate?.();
      trRef.current?.getLayer()?.batchDraw();
      stageRef.current?.batchDraw();
    },
    []
  );

  const onStageDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!multiDrag.current.active) return;

    const selected = selectedIdsRef.current;
    selected.forEach((id) => {
      const n = getNodeRefById(id);
      if (!n) return;
      const { x, y } = n.position();

      if (id === rect.id) setRect((r) => ({ ...r, x, y }));
      else if (id === text.id) setText((t) => ({ ...t, x, y }));
      else if (id === image.id) setImage((im) => ({ ...im, x, y }));
    });

    // reset
    multiDrag.current.active = false;
    multiDrag.current.driverId = null;
    multiDrag.current.driverStart = null;
    multiDrag.current.starts = {};
  }, []);

  // ---- Anexar Transformer aos nós selecionados
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;

    const nodes: Konva.Node[] = [];
    for (const id of selectedIds) {
      const n = stage.findOne<Konva.Node>(`#${id}`);
      if (n) nodes.push(n);
    }

    tr.nodes(nodes);
    tr.moveToTop();
    tr.getLayer()?.batchDraw();
    tr.getStage()?.batchDraw();
  }, [selectedIds, rect, text, image, imgEl]);

  return (
    <Stage
      ref={stageRef}
      width={900}
      height={600}
      onMouseDown={onStageMouseDown}
      onDragStart={onStageDragStart}
      onDragMove={onStageDragMove}
      onDragEnd={onStageDragEnd}
      style={{ background: "#f8fafc" }}>
      {/* ✅ Única Layer para nós + Transformer */}
      <Layer>
        {/* Retângulo */}
        <Rect
          id={rect.id}
          ref={rectNodeRef}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rotation={rect.rotation}
          fill={rect.fill}
          draggable
          onMouseDown={onRectMouseDown}
          onTap={onRectMouseDown}
          onTransformEnd={onRectTransformEnd}
        />

        {/* Texto */}
        <KText
          id={text.id}
          ref={textNodeRef}
          x={text.x}
          y={text.y}
          width={text.width}
          rotation={text.rotation}
          text={text.text}
          fontSize={text.fontSize}
          fontFamily={text.fontFamily}
          fill={text.fill}
          align={text.align}
          draggable
          onMouseDown={onTextMouseDown}
          onTap={onTextMouseDown}
          onTransformEnd={onTextTransformEnd}
        />

        {/* Imagem */}
        <KonvaImage
          id={image.id}
          ref={imageNodeRef}
          x={image.x}
          y={image.y}
          scaleX={image.scaleX}
          scaleY={image.scaleY}
          rotation={image.rotation}
          image={imageToUse}
          draggable
          onMouseDown={onImageMouseDown}
          onTap={onImageMouseDown}
          hitStrokeWidth={10}
          onTransformEnd={onImageTransformEnd}
        />

        {/* Transformer — deve ficar depois dos nós e na mesma Layer */}
        <Transformer
          ref={trRef}
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
          rotateEnabled
          padding={4}
          anchorSize={8}
          anchorCornerRadius={1}
          rotateAnchorOffset={20}
          anchorStrokeWidth={1}
          borderStrokeWidth={1}
          borderStroke={"#2b7fff"}
          anchorStroke={"#2b7fff"}
          ignoreStroke
        />
      </Layer>
    </Stage>
  );
}
