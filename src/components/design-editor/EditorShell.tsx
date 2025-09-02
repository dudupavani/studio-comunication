// src/components/design-editor/EditorShell.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import PropertiesPanel from "./PropertiesPanel";

import {
  Circle as IconCircle,
  Image as IconImage,
  Type as IconType,
  Square as IconSquare,
  Triangle as IconTriangle,
  Minus as IconMinus,
  Star as IconStar,
  X as IconX,
} from "lucide-react";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

import { useDesignEditor } from "@/hooks/design-editor/use-design-editor";
import LayersPanel from "@/components/design-editor/LayersPanel";

const Canvas = dynamic(() => import("./Canvas"), { ssr: false });

type Panel = "none" | "formas" | "imagens";
const DND_MIME = "application/x-design-editor";

export default function EditorShell() {
  const PROP_BAR_H = 72;

  const [panel, setPanel] = useState<Panel>("none");

  const { create } = useDesignEditor();

  function cmd(name: string, detail: any) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }
  const clearSelection = () => cmd("design-editor:select", { id: null });

  function handleAddText() {
    setPanel("none");
    create("text");
  }

  function handleToggleImagens() {
    setPanel((p) => (p === "imagens" ? "none" : "imagens"));
  }
  function handleToggleFormas() {
    setPanel((p) => (p === "formas" ? "none" : "formas"));
  }

  const addRect = () => create("rect");
  const addCircle = () => create("circle");
  const addTriangle = () => create("triangle");
  const addLine = () => create("line");
  const addStar = () => create("star");

  const onDragStart =
    (type: string) => (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData(DND_MIME, JSON.stringify({ type }));
      e.dataTransfer.setData("text/plain", type);
    };

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel("none");
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const columns = panel === "formas" ? "100px 120px 1fr" : "100px 1fr";

  const onEmptyAreaMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Barra de propriedades (topo) */}
      <header
        className="border-b border-gray-200 bg-white p-3 sticky top-0 z-50"
        onMouseDown={onEmptyAreaMouseDown}>
        <PropertiesPanel />
      </header>

      {/* Grade principal */}
      <div
        className="grid flex-1"
        style={{
          gridTemplateColumns: columns,
          height: `calc(100vh - ${PROP_BAR_H}px)`,
        }}>
        {/* Lateral esquerda */}
        <aside
          className="border-r border-gray-200 p-2 bg-white"
          style={{ height: `calc(100vh - ${PROP_BAR_H}px)` }}
          onMouseDown={onEmptyAreaMouseDown}>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-4"
              onClick={handleAddText}
              draggable
              onDragStart={onDragStart("text")}
              title="Arraste ou clique para inserir texto">
              <IconType size={28} />
              Texto
            </Button>
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-4"
              onClick={handleToggleImagens}
              title="Ferramentas de imagens">
              <IconImage size={28} />
              Imagens
            </Button>
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-4"
              onClick={handleToggleFormas}
              title="Abrir/fechar submenu de formas">
              <IconCircle size={28} />
              Formas
            </Button>
          </div>
        </aside>

        {/* Submenu Formas */}
        {panel === "formas" && (
          <aside
            className="border-r border-gray-200 p-2 bg-white overflow-y-auto"
            style={{ height: `calc(100vh - ${PROP_BAR_H}px)` }}
            onMouseDown={onEmptyAreaMouseDown}>
            <div className="flex items-center justify-between mt-1 mb-3">
              <div className="text-base font-semibold">Formas</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                onClick={() => setPanel("none")}
                aria-label="Fechar painel de formas"
                title="Fechar (Esc)">
                <IconX className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-center items-center p-8 cursor-grab"
                onClick={addRect}
                draggable
                onDragStart={onDragStart("rect")}
                title="Arraste ou clique">
                <IconSquare className="h-10 w-10" />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-8 cursor-grab"
                onClick={addCircle}
                draggable
                onDragStart={onDragStart("circle")}
                title="Arraste ou clique">
                <IconCircle className="h-10 w-10" />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-8 cursor-grab"
                onClick={addTriangle}
                draggable
                onDragStart={onDragStart("triangle")}
                title="Arraste ou clique">
                <IconTriangle className="h-10 w-10" />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-8 cursor-grab"
                onClick={addLine}
                draggable
                onDragStart={onDragStart("line")}
                title="Arraste ou clique">
                <IconMinus className="h-10 w-10" />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-8 cursor-grab"
                onClick={addStar}
                draggable
                onDragStart={onDragStart("star")}
                title="Arraste ou clique">
                <IconStar className="h-10 w-10" />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-2 mt-4">
              <span className="text-xs text-center text-gray-500">
                Arraste ou clique para inserir.
              </span>
              <span className="text-xs text-center text-gray-500">
                ESC para fechar a coluna.
              </span>
            </div>
          </aside>
        )}

        {/* Área redimensionável */}
        <ResizablePanelGroup
          direction="horizontal"
          className="overflow-hidden"
          style={{ height: `calc(100vh - ${PROP_BAR_H}px)` }}>
          <ResizablePanel defaultSize={75} minSize={40}>
            <section className="flex h-full flex-col">
              <main
                className="bg-muted p-3 flex-1 overflow-auto"
                onMouseDown={onEmptyAreaMouseDown}>
                <Canvas />
              </main>
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Painel Camadas (agora via componente dedicado) */}
          <ResizablePanel defaultSize={25} minSize={16} maxSize={50}>
            <aside onMouseDown={onEmptyAreaMouseDown}>
              <LayersPanel />
            </aside>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
