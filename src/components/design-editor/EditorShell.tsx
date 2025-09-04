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
  LayoutGrid as IconLayoutGrid,
  Instagram,
  Linkedin,
  Facebook,
  Youtube,
} from "lucide-react";

import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

import { useDesignEditor } from "@/hooks/design-editor/use-design-editor";
import LayersPanel from "@/components/design-editor/LayersPanel";

// ✅ painel de imagens
import ImagesPanel from "./images/ImagesPanel";
// ✅ hook de auth
import { useAuthContext } from "@/hooks/use-auth-context";

const Canvas = dynamic(() => import("./Canvas"), { ssr: false });

type Panel = "none" | "formas" | "imagens" | "templates";
const DND_MIME = "application/x-design-editor";

export default function EditorShell() {
  const PROP_BAR_H = 72;

  const [panel, setPanel] = useState<Panel>("none");

  const { create } = useDesignEditor();

  // ✅ extrai orgId/userId de auth (formas alternativas para compatibilidade)
  const { auth } = useAuthContext();
  const orgId =
    (auth as any)?.orgId ??
    (auth as any)?.org?.id ??
    (auth as any)?.organizationId ??
    null;
  const userId = (auth as any)?.userId ?? (auth as any)?.user?.id ?? null;

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
  function handleToggleTemplates() {
    setPanel((p) => (p === "templates" ? "none" : "templates"));
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

  // inclui "imagens" para abrir a coluna extra
  const columns =
    panel === "formas" || panel === "templates" || panel === "imagens"
      ? "90px 220px 1fr"
      : "90px 1fr";

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
              className="text-xs flex flex-col items-center h-auto py-3"
              onClick={handleAddText}
              draggable
              onDragStart={onDragStart("text")}
              title="Arraste ou clique para inserir texto">
              <IconType size={20} />
              Texto
            </Button>
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-3"
              onClick={handleToggleImagens}
              title="Ferramentas de imagens">
              <IconImage size={20} />
              Imagens
            </Button>
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-3"
              onClick={handleToggleFormas}
              title="Abrir/fechar submenu de formas">
              <IconCircle size={20} />
              Formas
            </Button>

            {/* ⬇️ Botão: Templates */}
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-3"
              onClick={handleToggleTemplates}
              title="Abrir/fechar submenu de templates">
              <IconLayoutGrid size={20} />
              Templates
            </Button>
          </div>
        </aside>

        {/* Submenu Imagens */}
        {panel === "imagens" && (
          <aside
            className="border-r border-gray-200 p-2 bg-white overflow-y-auto"
            style={{ height: `calc(100vh - ${PROP_BAR_H}px)` }}
            onMouseDown={onEmptyAreaMouseDown}>
            <div className="flex items-center justify-between mt-1 mb-3">
              <div className="text-base font-semibold">Imagens</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                onClick={() => setPanel("none")}
                aria-label="Fechar painel de imagens"
                title="Fechar (Esc)">
                <IconX className="h-4 w-4" />
              </Button>
            </div>

            {orgId && userId ? (
              <ImagesPanel orgId={orgId} userId={userId} />
            ) : (
              <div className="text-xs text-gray-500">
                Faça login para carregar suas imagens.
              </div>
            )}
          </aside>
        )}

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
                className="justify-center items-center p-6 cursor-grab"
                onClick={addRect}
                draggable
                onDragStart={onDragStart("rect")}
                title="Arraste ou clique">
                <IconSquare size={34} />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-6 cursor-grab"
                onClick={addCircle}
                draggable
                onDragStart={onDragStart("circle")}
                title="Arraste ou clique">
                <IconCircle size={34} />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-6 cursor-grab"
                onClick={addTriangle}
                draggable
                onDragStart={onDragStart("triangle")}
                title="Arraste ou clique">
                <IconTriangle size={34} />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-6 cursor-grab"
                onClick={addLine}
                draggable
                onDragStart={onDragStart("line")}
                title="Arraste ou clique">
                <IconMinus size={34} />
              </Button>
              <Button
                variant="outline"
                className="justify-center items-center p-6 cursor-grab"
                onClick={addStar}
                draggable
                onDragStart={onDragStart("star")}
                title="Arraste ou clique">
                <IconStar size={34} />
              </Button>
            </div>

            <div className="flex flex-col items-center gap-2 mt-4">
              <span className="text-[11px] leading-none text-left text-gray-400">
                Arraste ou clique para inserir.
              </span>
              <span className="text-[11px] leading-none text-left text-gray-400">
                ESC para fechar a coluna.
              </span>
            </div>
          </aside>
        )}

        {/* Submenu Templates */}
        {panel === "templates" && (
          <aside
            className="border-r border-gray-200 p-2 bg-white overflow-y-auto"
            style={{ height: `calc(100vh - ${PROP_BAR_H}px)` }}
            onMouseDown={onEmptyAreaMouseDown}>
            <div className="flex items-center justify-between mt-1 mb-3">
              <div className="text-base font-semibold">Templates</div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md"
                onClick={() => setPanel("none")}
                aria-label="Fechar painel de templates"
                title="Fechar (Esc)">
                <IconX className="h-4 w-4" />
              </Button>
            </div>

            {/* Agora com onClick emitindo o evento global */}
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="flex flex-col items-center h-auto text-xs text-muted-foreground py-3"
                title="Instagram 1080×1080"
                onClick={() =>
                  cmd("design-editor:artboard:set", {
                    templateId: "instagram-square",
                    width: 1080,
                    height: 1080,
                  })
                }>
                <Instagram />
                1080×1080px
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center h-auto text-xs text-muted-foreground py-3"
                title="Instagram 1080×1350 (Retrato)"
                onClick={() =>
                  cmd("design-editor:artboard:set", {
                    templateId: "instagram-portrait",
                    width: 1080,
                    height: 1350,
                  })
                }>
                <Instagram />
                1080×1350px
                <br />
                Retrato
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center h-auto text-xs text-muted-foreground py-3"
                title="Instagram 1080×1920 (Story)"
                onClick={() =>
                  cmd("design-editor:artboard:set", {
                    templateId: "instagram-story",
                    width: 1080,
                    height: 1920,
                  })
                }>
                <Instagram />
                1080×1920px <br />
                Storie
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center h-auto text-xs text-muted-foreground py-3"
                title="LinkedIn 1584×396 (Capa)"
                onClick={() =>
                  cmd("design-editor:artboard:set", {
                    templateId: "linkedin-cover",
                    width: 1584,
                    height: 396,
                  })
                }>
                <Linkedin />
                1584x396px
                <br />
                Capa
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center h-auto text-xs text-muted-foreground py-3"
                title="Facebook 1200×630 (Paisagem)"
                onClick={() =>
                  cmd("design-editor:artboard:set", {
                    templateId: "facebook-link",
                    width: 1200,
                    height: 630,
                  })
                }>
                <Facebook />
                1200×630px
                <br />
                Paisagem
              </Button>

              <Button
                variant="outline"
                className="flex flex-col items-center h-auto text-xs text-muted-foreground py-3"
                title="YouTube 1920×1080 (Capa vídeo)"
                onClick={() =>
                  cmd("design-editor:artboard:set", {
                    templateId: "youtube-cover",
                    width: 1920,
                    height: 1080,
                  })
                }>
                <Youtube />
                1920×1080px
                <br />
                Capa vídeo
              </Button>
            </div>

            <div className="flex flex-col items-start gap-2 mt-4">
              <span className="text-[11px] leading-none text-left text-gray-400">
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
                className="bg-gray-200 p-3 flex-1 overflow-auto"
                onMouseDown={onEmptyAreaMouseDown}>
                <Canvas />
              </main>
            </section>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Painel Camadas */}
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
