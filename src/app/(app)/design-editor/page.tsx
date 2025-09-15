// src/app/(app)/design-editor/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { EditorProvider } from "./editor/store";
import InsertMenu from "./editor/InsertMenu";
import FormsPanel from "./editor/FormsPanel";
import ImagesPanel from "./editor/ImagesPanel"; // ✅ novo import

const StageView = dynamic(
  () => import("./editor/StageView").then((m) => m.StageView),
  { ssr: false }
);

export default function DesignEditorPage() {
  // agora pode ser none | shapes | images
  const [rightPanel, setRightPanel] = useState<"none" | "shapes" | "images">(
    "none"
  );

  return (
    <EditorProvider>
      {/* layout em colunas: [menu] [painel opcional] [stage] */}
      <div className="flex h-dvh overflow-hidden">
        {/* Coluna 1: menu vertical */}
        <div className="w-16 border-r bg-muted flex items-start">
          <InsertMenu
            onOpenShapes={() =>
              setRightPanel((p) => (p === "shapes" ? "none" : "shapes"))
            }
            onOpenImages={() =>
              setRightPanel((p) => (p === "images" ? "none" : "images"))
            }
          />
        </div>

        {/* Coluna 2: painel lateral (abre/fecha) */}
        {rightPanel === "shapes" && (
          <div className="w-50 border-r border-gray-200 bg-white">
            <FormsPanel onClose={() => setRightPanel("none")} />
          </div>
        )}

        {rightPanel === "images" && (
          <div className="w-60 border-r border-gray-200 bg-white">
            <ImagesPanel onClose={() => setRightPanel("none")} />
          </div>
        )}

        {/* Coluna 3: Stage ocupa o restante */}
        <div className="flex-1 min-w-0 flex items-center justify-center bg-gray-100">
          <StageView />
        </div>
      </div>
    </EditorProvider>
  );
}
