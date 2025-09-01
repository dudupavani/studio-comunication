"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Text as KonvaText,
  Transformer,
  Circle as KonvaCircle,
} from "react-konva";
import type Konva from "konva";

// ========= Tipos =========
type ShapeBase = {
  id: string;
  type: "rect" | "text" | "circle";
  x: number;
  y: number;
  rotation: number;
};

type ShapeRect = ShapeBase & {
  type: "rect";
  width: number;
  height: number;
  fill: string;
  cornerRadius?: number;
  opacity?: number;
  shadowBlur?: number;
};

type ShapeCircle = ShapeBase & {
  type: "circle";
  radius: number;
  fill: string;
  opacity?: number;
  shadowBlur?: number;
};

type ShapeText = ShapeBase & {
  type: "text";
  text: string;
  fontSize: number;
  width?: number; // para permitir wrap ao transformar
  height?: number; // mantemos por consistência
  fill?: string;
  fontStyle?: string;
};

type AnyShape = ShapeRect | ShapeCircle | ShapeText;

export default function Canvas() {
  // container externo (não medido) e container de medição interno
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState({ width: 600, height: 450 });

  // ======= MODELO DE DADOS: múltiplos shapes =======
  const [shapes, setShapes] = useState<AnyShape[]>(() => [
    {
      id: "rect-1",
      type: "rect",
      x: 40,
      y: 40,
      width: 120,
      height: 120,
      rotation: 0,
      fill: "#ef4444",
      cornerRadius: 12,
      opacity: 0.9,
      shadowBlur: 8,
    },
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Mapa de refs: id -> nó Konva
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});
  const trRef = useRef<Konva.Transformer>(null);

  // ======= Responsivo ao container (medindo a DIV interna "neutra") =======
  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const update = () => {
      const w = Math.max(320, Math.floor(el.clientWidth)); // evita jitter com floor
      setSize((prev) => {
        if (prev.width === w) return prev; // evita setState desnecessário
        const h = Math.max(360, Math.round((w * 9) / 16));
        return { width: w, height: h };
      });
    };

    const ro = new ResizeObserver(update);
    ro.observe(el);
    update(); // mede inicialmente

    return () => ro.disconnect();
  }, []);

  // ======= Conecta Transformer ao shape selecionado =======
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

  // ======= Clique em área vazia deseleciona =======
  const handleStagePointerDown = (e: any) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) setSelectedId(null);
  };

  // ======= Drag / Transform =======
  const handleDragEnd = (id: string, e: any) => {
    const { x, y } = e.target.position();
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const handleTransformEnd = (id: string) => {
    const node = shapeRefs.current[id];
    if (!node) return;

    const shape = shapes.find((s) => s.id === id);
    if (!shape) return;

    const scaleX = (node as any).scaleX?.() ?? 1;
    const scaleY = (node as any).scaleY?.() ?? 1;

    if (shape.type === "rect") {
      const rect = node as Konva.Rect;
      const newWidth = Math.max(5, rect.width() * scaleX);
      const newHeight = Math.max(5, rect.height() * scaleY);

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
      // usa média das escalas para manter proporção
      const scale = (scaleX + scaleY) / 2;
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

    if (shape.type === "text") {
      const textNode = node as Konva.Text;

      const newWidth = Math.max(20, textNode.width() * scaleX);
      const newHeight = Math.max(20, textNode.height() * scaleY);

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

  // ======= Delete (teclado) =======
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

  // ======= Eventos p/ adicionar shapes via CustomEvent =======
  useEffect(() => {
    const addRect = () => {
      const id = `rect-${crypto.randomUUID().slice(0, 8)}`;
      const base = 60 + shapes.length * 20;
      setShapes((prev) => [
        ...prev,
        {
          id,
          type: "rect",
          x: base,
          y: base,
          width: 140,
          height: 100,
          rotation: 0,
          fill: "#6366f1",
          cornerRadius: 10,
          opacity: 0.95,
          shadowBlur: 8,
        } as ShapeRect,
      ]);
      setSelectedId(id);
    };

    const addCircle = () => {
      const id = `circle-${crypto.randomUUID().slice(0, 8)}`;
      const base = 120 + shapes.length * 18;
      setShapes((prev) => [
        ...prev,
        {
          id,
          type: "circle",
          x: base,
          y: base,
          radius: 60,
          rotation: 0,
          fill: "#10b981",
          opacity: 0.95,
          shadowBlur: 6,
        } as ShapeCircle,
      ]);
      setSelectedId(id);
    };

    const addText = () => {
      const id = `text-${crypto.randomUUID().slice(0, 8)}`;
      const base = 80 + shapes.length * 12;
      setShapes((prev) => [
        ...prev,
        {
          id,
          type: "text",
          x: base,
          y: base,
          rotation: 0,
          text: "Seu texto aqui",
          fontSize: 28,
          width: 240, // habilita wrap ao redimensionar
          height: 40,
          fill: "#111827",
          fontStyle: "bold", // recomendado em vez de "600"
        } as ShapeText,
      ]);
      setSelectedId(id);
    };

    const onAddRect = () => addRect();
    const onAddCircle = () => addCircle();
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
        "design-editor:add-text",
        onAddText as EventListener
      );
    };
  }, [shapes.length]);

  // ======= Texto de rodapé contextual =======
  const hint = useMemo(() => {
    if (selectedId)
      return "Dica: use Delete/Backspace para remover o elemento selecionado.";
    return "Dica: clique em um elemento para selecionar. Arraste para mover. Use as alças para redimensionar/rotacionar.";
  }, [selectedId]);

  return (
    <div ref={outerRef} className="w-full">
      <div className="border p-3 bg-white w-full overflow-hidden">
        {/* Medimos esta div interna com w-full (neutra) */}
        <div ref={measureRef} className="w-full">
          <Stage
            width={size.width}
            height={size.height}
            onMouseDown={handleStagePointerDown}
            onTouchStart={handleStagePointerDown}>
            <Layer>
              {/* Título fixo (apenas informativo) */}
              <KonvaText
                text="Hello Konva 👋"
                x={16}
                y={12}
                fontSize={18}
                fontStyle="bold"
                fill="#111827"
              />

              {/* Render de todos os shapes */}
              {shapes.map((s) => {
                if (s.type === "rect") {
                  const r = s as ShapeRect;
                  return (
                    <Rect
                      key={r.id}
                      ref={(node) => {
                        shapeRefs.current[r.id] = node;
                      }}
                      name={r.id}
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      rotation={r.rotation}
                      cornerRadius={r.cornerRadius}
                      fill={r.fill}
                      opacity={r.opacity}
                      shadowBlur={r.shadowBlur}
                      draggable
                      onClick={() => setSelectedId(r.id)}
                      onTap={() => setSelectedId(r.id)}
                      onDragEnd={(e) => handleDragEnd(r.id, e)}
                      onTransformEnd={() => handleTransformEnd(r.id)}
                      onMouseEnter={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = "grab";
                      }}
                      onMouseLeave={(e) => {
                        const c = e.target.getStage()?.container();
                        if (c) c.style.cursor = "default";
                      }}
                    />
                  );
                }

                if (s.type === "circle") {
                  const c = s as ShapeCircle;
                  return (
                    <KonvaCircle
                      key={c.id}
                      ref={(node) => {
                        shapeRefs.current[c.id] = node;
                      }}
                      name={c.id}
                      x={c.x}
                      y={c.y}
                      radius={c.radius}
                      rotation={c.rotation}
                      fill={c.fill}
                      opacity={c.opacity}
                      shadowBlur={c.shadowBlur}
                      draggable
                      onClick={() => setSelectedId(c.id)}
                      onTap={() => setSelectedId(c.id)}
                      onDragEnd={(e) => handleDragEnd(c.id, e)}
                      onTransformEnd={() => handleTransformEnd(c.id)}
                      onMouseEnter={(e) => {
                        const cont = e.target.getStage()?.container();
                        if (cont) cont.style.cursor = "grab";
                      }}
                      onMouseLeave={(e) => {
                        const cont = e.target.getStage()?.container();
                        if (cont) cont.style.cursor = "default";
                      }}
                    />
                  );
                }

                // text
                const t = s as ShapeText;
                return (
                  <KonvaText
                    key={t.id}
                    ref={(node) => {
                      shapeRefs.current[t.id] = node;
                    }}
                    name={t.id}
                    x={t.x}
                    y={t.y}
                    text={t.text}
                    fontSize={t.fontSize}
                    width={t.width}
                    height={t.height}
                    rotation={t.rotation}
                    fill={t.fill}
                    fontStyle={t.fontStyle}
                    draggable
                    onClick={() => setSelectedId(t.id)}
                    onTap={() => setSelectedId(t.id)}
                    onDragEnd={(e) => handleDragEnd(t.id, e)}
                    onTransformEnd={() => handleTransformEnd(t.id)}
                    onMouseEnter={(e) => {
                      const c = e.target.getStage()?.container();
                      if (c) c.style.cursor = "text";
                    }}
                    onMouseLeave={(e) => {
                      const c = e.target.getStage()?.container();
                      if (c) c.style.cursor = "default";
                    }}
                  />
                );
              })}

              {/* Transformer único controla o selecionado */}
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

              {/* Rodapé com dicas */}
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
