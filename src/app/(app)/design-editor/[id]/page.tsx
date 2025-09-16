// src/app/(app)/design-editor/[id]/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { EditorProvider, useEditor } from "../editor/store";
import InsertMenu from "../editor/InsertMenu";
import FormsPanel from "../editor/FormsPanel";
import ImagesPanel from "../editor/ImagesPanel";
import StagePanel from "../editor/StagePanel";
import ActionBar from "../editor/ActionBar";

const StageView = dynamic(
  () => import("../editor/StageView").then((m) => m.StageView),
  { ssr: false }
);

function InnerEditor({ id }: { id: string }) {
  const [rightPanel, setRightPanel] = useState<
    "none" | "shapes" | "images" | "stage"
  >("none");

  const { api } = useEditor();

  useEffect(() => {
    let cancelled = false;

    async function fetchFile() {
      try {
        const res = await fetch(`/api/design-files/${id}`);
        if (!res.ok) throw new Error("Erro ao buscar arquivo");
        const file = await res.json();

        if (!cancelled && file) {
          if (file.data) {
            api.loadFromJSON(file.data);
          }
          if (file.title) {
            api.setFileTitle(file.title);
          }
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Erro carregando design:", e);
        }
      }
    }

    fetchFile();

    return () => {
      cancelled = true;
    };
  }, [id]); // 👈 só depende do id (evita loop com api)

  return (
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
          onOpenStage={() =>
            setRightPanel((p) => (p === "stage" ? "none" : "stage"))
          }
        />
      </div>

      {/* Coluna 2: painel lateral */}
      {rightPanel === "stage" && (
        <div className="w-56 border-r border-gray-200 bg-white">
          <StagePanel onClose={() => setRightPanel("none")} />
        </div>
      )}
      {rightPanel === "shapes" && (
        <div className="w-56 border-r border-gray-200 bg-white">
          <FormsPanel onClose={() => setRightPanel("none")} />
        </div>
      )}
      {rightPanel === "images" && (
        <div className="w-56 border-r border-gray-200 bg-white">
          <ImagesPanel onClose={() => setRightPanel("none")} />
        </div>
      )}

      {/* Coluna 3: Stage + ActionBar */}
      <div className="flex flex-col flex-1 min-w-0">
        <ActionBar fileId={id} />
        <div className="flex-1 flex items-center justify-center bg-gray-300">
          <StageView />
        </div>
      </div>
    </div>
  );
}

export default function DesignEditorPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;

  return (
    <EditorProvider>
      <InnerEditor id={id} />
    </EditorProvider>
  );
}
