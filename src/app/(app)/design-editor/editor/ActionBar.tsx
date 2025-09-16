// src/app/(app)/design-editor/editor/ActionBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEditor } from "./store";

// Inline bars
import FileInlineBar from "./actionbar/FileInlineBar";
import TextInlineBar from "./actionbar/TextInlineBar";
import ShapeInlineBar from "./actionbar/ShapeInlineBar";
// import ImageInlineBar from "./actionbar/ImageInlineBar"; // se ainda não existir, comente esta linha e o uso

type ActionBarProps = {
  fileId: string;
};

export default function ActionBar({ fileId }: ActionBarProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { api, state } = useEditor();

  const selectedIds = state.selectedIds || [];
  let selectionKind: "none" | "multi" | "element" = "none";
  if (selectedIds.length === 1) selectionKind = "element";
  else if (selectedIds.length > 1) selectionKind = "multi";

  const selectedId = selectedIds[0];
  const selected = selectedId ? state.shapes[selectedId] : null;
  const selectedType = selected?.type;

  const isText = selectedType === "text";
  const isImage = selectedType === "image";
  const isShape =
    !!selectedType && selectedType !== "text" && selectedType !== "image"; // rect | circle | triangle | star | polygon

  async function handleSave() {
    try {
      setSaving(true);
      const payload = api.toJSON();
      api.clearSelection?.();

      const stage = api.getStageRef();
      let thumbnail: string | null = null;
      if (stage?.toDataURL) {
        thumbnail = stage.toDataURL({ pixelRatio: 0.6, mimeType: "image/png" });
      }

      const res = await fetch(`/api/design-files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.fileTitle || "Novo arquivo",
          data: payload,
          thumbnail,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Falha ao salvar:", err);
      } else {
        console.log("✅ Salvo com sucesso");
      }
    } catch (e) {
      console.error("❌ Erro de rede ao salvar:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border-b bg-white px-3 py-2 flex items-center justify-between">
      {/* lado esquerdo: voltar + inline bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/design-editor")}>
          <ArrowLeft size={22} />
        </Button>

        {selectionKind === "none" && <FileInlineBar fileId={fileId} />}

        {selectionKind === "element" && isText && selectedId && (
          <TextInlineBar nodeId={selectedId} />
        )}

        {selectionKind === "element" && isShape && selectedId && (
          <ShapeInlineBar nodeId={selectedId} />
        )}

        {/* {selectionKind === "element" && isImage && selectedId && (
          <ImageInlineBar nodeId={selectedId} />
        )} */}

        {selectionKind === "multi" && (
          <div className="text-sm text-gray-500">
            Seleção múltipla ({selectedIds.length})
          </div>
        )}
      </div>

      {/* lado direito: botão salvar */}
      <div className="flex items-center gap-2 pr-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
