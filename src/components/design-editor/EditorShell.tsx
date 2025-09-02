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
  Eye as IconEye,
  EyeOff as IconEyeOff,
  Lock as IconLock,
  Unlock as IconUnlock,
  Trash2 as IconTrash,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const Canvas = dynamic(() => import("./Canvas"), { ssr: false });

// 🔧 removi "texto" do tipo Panel
type Panel = "none" | "formas" | "imagens";
const DND_MIME = "application/x-design-editor";

type LayerItem = {
  id: string;
  type: "rect" | "text" | "circle" | "triangle" | "line" | "star";
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;
};

export default function EditorShell() {
  const PROP_BAR_H = 72;

  const [panel, setPanel] = useState<Panel>("none");
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ---------- helpers ----------
  function dispatch(name: string) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(name));
    }
  }
  function cmd(name: string, detail: any) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }
  const clearSelection = () => cmd("design-editor:select", { id: null });

  // 🔧 Texto: agora apenas INSERE texto
  function handleAddText() {
    setPanel("none");
    dispatch("design-editor:add-text");
  }

  function handleToggleImagens() {
    setPanel((p) => (p === "imagens" ? "none" : "imagens"));
  }
  function handleToggleFormas() {
    setPanel((p) => (p === "formas" ? "none" : "formas"));
  }

  // clique dos itens do submenu de formas
  const addRect = () => dispatch("design-editor:add-rect");
  const addCircle = () => dispatch("design-editor:add-circle");
  const addTriangle = () => dispatch("design-editor:add-triangle");
  const addLine = () => dispatch("design-editor:add-line");
  const addStar = () => dispatch("design-editor:add-star");

  // drag do submenu -> canvas
  const onDragStart =
    (type: string) => (e: React.DragEvent<HTMLButtonElement>) => {
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData(DND_MIME, JSON.stringify({ type }));
      e.dataTransfer.setData("text/plain", type);
    };

  // ESC fecha painel
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanel("none");
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  // ouvir estado vindo do Canvas
  useEffect(() => {
    const onState = (e: any) => {
      const d = e.detail || {};
      setLayers(d.shapes || []);
      setSelectedId(d.selectedId ?? null);
    };
    window.addEventListener("design-editor:state", onState as EventListener);
    return () =>
      window.removeEventListener(
        "design-editor:state",
        onState as EventListener
      );
  }, []);

  const columns = panel === "formas" ? "100px 220px 1fr" : "100px 1fr";

  // mapping para ícone por tipo
  const TypeIcon = (t: LayerItem["type"]) =>
    t === "rect" ? (
      <IconSquare className="h-3.5 w-3.5" />
    ) : t === "circle" ? (
      <IconCircle className="h-3.5 w-3.5" />
    ) : t === "triangle" ? (
      <IconTriangle className="h-3.5 w-3.5" />
    ) : t === "line" ? (
      <IconMinus className="h-3.5 w-3.5" />
    ) : t === "star" ? (
      <IconStar className="h-3.5 w-3.5" />
    ) : (
      <IconType className="h-3.5 w-3.5" />
    );

  const orderedLayers = [...layers].reverse();

  // handler que só dispara quando clica no "fundo" do container (não em filhos)
  const onEmptyAreaMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      clearSelection();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Barra de propriedades global (topo) */}
      <header
        className="border-b border-gray-200 bg-white p-3 sticky top-0 z-50"
        onMouseDown={onEmptyAreaMouseDown}>
        <PropertiesPanel />
      </header>

      {/* Grade principal abaixo da barra (3 colunas) */}
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
              title="Inserir texto">
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

            <div className="grid grid-cols-2 gap-2">
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

            <p className="mt-6 text-xs text-center text-gray-500">
              Arraste a forma para o canvas, ou clique para inserir. — Pressione
              ESC para fechar a coluna.
            </p>
          </aside>
        )}

        {/* Área redimensionável (centro | handle | camadas) */}
        <ResizablePanelGroup
          direction="horizontal"
          className="overflow-hidden"
          style={{ height: `calc(100vh - ${PROP_BAR_H}px)` }}>
          <ResizablePanel defaultSize={75} minSize={40}>
            <section className="flex h-full flex-col">
              <main
                className="bg-muted p-3 flex-1 overflow-auto"
                onMouseDown={onEmptyAreaMouseDown} // clica no fundo (fora do Canvas) limpa seleção
              >
                <Canvas />
              </main>
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Painel Camadas */}
          <ResizablePanel defaultSize={25} minSize={16} maxSize={50}>
            <aside
              className="p-3 bg-white h-full overflow-y-auto"
              onMouseDown={onEmptyAreaMouseDown} // clique no espaço vazio das camadas limpa seleção
            >
              <div className="text-lg font-semibold mb-2">Camadas</div>

              <div className="space-y-1">
                {orderedLayers.map((layer) => {
                  const isSelected = layer.id === selectedId;
                  return (
                    <div
                      key={layer.id}
                      className={`flex items-center justify-between rounded-md border px-2 py-1.5 text-xs ${
                        isSelected ? "bg-gray-100 border-gray-300" : "bg-white"
                      }`}
                      onClick={() =>
                        cmd("design-editor:select", { id: layer.id })
                      }
                      role="button">
                      <div className="flex items-center gap-2">
                        {TypeIcon(layer.type)}
                        <span className="truncate max-w-[160px]">
                          {layer.name || layer.id}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            cmd("design-editor:send-backward", {
                              id: layer.id,
                            });
                          }}
                          title="Enviar para trás">
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            cmd("design-editor:bring-forward", {
                              id: layer.id,
                            });
                          }}
                          title="Trazer para frente">
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            cmd("design-editor:toggle-hidden", {
                              id: layer.id,
                            });
                          }}
                          title={layer.isHidden ? "Mostrar" : "Ocultar"}>
                          {layer.isHidden ? (
                            <IconEyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <IconEye className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            cmd("design-editor:toggle-locked", {
                              id: layer.id,
                            });
                          }}
                          title={layer.isLocked ? "Desbloquear" : "Bloquear"}>
                          {layer.isLocked ? (
                            <IconUnlock className="h-3.5 w-3.5" />
                          ) : (
                            <IconLock className="h-3.5 w-3.5" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            cmd("design-editor:delete", { id: layer.id });
                          }}
                          title="Excluir">
                          <IconTrash className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {orderedLayers.length === 0 && (
                  <div className="text-[11px] text-muted-foreground">
                    Nenhuma camada ainda. Adicione formas/texto no painel
                    esquerdo.
                  </div>
                )}
              </div>
            </aside>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}
