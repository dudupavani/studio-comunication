"use client";

import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Circle, Image, Type } from "lucide-react";

const Canvas = dynamic(() => import("./Canvas"), { ssr: false });

export default function EditorShell() {
  function handleAddText() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("design-editor:add-text"));
    }
  }
  function handleAddRect() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("design-editor:add-rect"));
    }
  }
  // (pronto p/ próxima etapa)
  function handleAddCircle() {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("design-editor:add-circle"));
    }
  }

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: "100px 6fr 2fr" }}>
        {/* Sidebar esquerda (Ferramentas) */}
        <aside className="border-r border-gray-200 p-2 bg-white h-[calc(100vh-120px)]">
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-4"
              onClick={handleAddText}>
              <Type size={28} />
              Texto
            </Button>
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-4">
              <Image size={28} />
              Imagens
            </Button>
            <Button
              variant="outline"
              className="text-xs flex flex-col items-center h-auto py-4"
              onClick={handleAddRect}>
              <Circle size={28} />
              Formas
            </Button>
          </div>
        </aside>

        {/* Coluna central */}
        <section className="flex flex-col">
          <header className="border-b border-gray-200 p-3 bg-white h-[72px] flex items-center">
            <div className="text-sm text-muted-foreground">
              Propriedades do elemento selecionado (texto, imagem, formas)
            </div>
          </header>

          <main className="bg-muted p-3 min-h-[60vh]">
            <Canvas />
          </main>
        </section>

        {/* Sidebar direita (Layers) */}
        <aside className="border-l border-gray-200 p-3 bg-white h-[calc(100vh-120px)]">
          <div className="text-sm font-medium mb-2">Camadas</div>
          <div className="text-xs text-muted-foreground">
            Em breve: ordem, visibilidade, bloquear, renomear…
          </div>
        </aside>
      </div>
    </div>
  );
}
