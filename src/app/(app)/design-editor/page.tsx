"use client";

import dynamic from "next/dynamic";
import { EditorProvider } from "./editor/store";
import InsertMenu from "./editor/InsertMenu";

// StageView só roda no client (Konva não funciona no SSR)
const StageView = dynamic(
  () => import("./editor/StageView").then((m) => m.StageView),
  { ssr: false }
);

export default function DesignEditorPage() {
  return (
    <EditorProvider>
      <div className="flex h-screen w-screen overflow-hidden">
        {/* Coluna esquerda: menu de inserção */}
        <div className="w-16 border-r bg-muted flex items-start">
          <InsertMenu />
        </div>

        {/* Centro: área do editor */}
        <div className="flex-1 flex items-center justify-center bg-background">
          <StageView />
        </div>
      </div>
    </EditorProvider>
  );
}
