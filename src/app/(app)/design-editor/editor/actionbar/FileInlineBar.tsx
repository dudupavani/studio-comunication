// src/app/(app)/design-editor/editor/actionbar/FileInlineBar.tsx
"use client";

import { useState } from "react";
import { useEditor } from "../store";
import { EditableText } from "@/components/ui/editable-text";

type FileInlineBarProps = {
  fileId: string;
};

export default function FileInlineBar({ fileId }: FileInlineBarProps) {
  const { api, state } = useEditor();
  const [savingTitle, setSavingTitle] = useState(false);

  async function handleSaveTitle(newTitle: string) {
    try {
      setSavingTitle(true);

      // atualiza no store imediatamente
      api.setFileTitle(newTitle);

      // captura thumbnail atual
      const stage = api.getStageRef();
      let thumbnail: string | null = null;
      if (stage?.toDataURL) {
        thumbnail = stage.toDataURL({
          pixelRatio: 0.6,
          mimeType: "image/png",
        });
      }

      // salva no backend
      const res = await fetch(`/api/design-files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          data: api.toJSON(),
          thumbnail,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Falha ao salvar título:", err);
      } else {
        console.log("✅ Título atualizado:", newTitle);
      }
    } catch (e) {
      console.error("❌ Erro ao salvar título:", e);
    } finally {
      setSavingTitle(false);
    }
  }

  return (
    <EditableText
      value={state.fileTitle || "Novo arquivo"}
      onSave={handleSaveTitle}
      className="text-base font-medium"
    />
  );
}
