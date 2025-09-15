// src/app/(app)/design-editor/editor/ActionBar.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useEditor } from "./store";
import { EditableText } from "@/components/ui/editable-text";

type ActionBarProps = {
  fileId: string;
};

export default function ActionBar({ fileId }: ActionBarProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { api, state } = useEditor();

  async function handleSave() {
    try {
      setSaving(true);

      // 🔹 pega o JSON do editor
      const payload = api.toJSON();

      // 🔹 limpa seleção/overlays antes de capturar
      api.clearSelection?.();

      // 🔹 pega o Stage atual (Konva) → gera thumbnail
      const stage = api.getStageRef();
      let thumbnail: string | null = null;
      if (stage?.toDataURL) {
        thumbnail = stage.toDataURL({
          pixelRatio: 0.6,
          mimeType: "image/png",
        });
      }

      // 🔹 envia pro backend
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

  async function handleSaveTitle(newTitle: string) {
    try {
      // 🔹 atualiza no store imediatamente
      api.setFileTitle(newTitle);

      // 🔹 salva no backend junto do JSON e thumbnail
      const stage = api.getStageRef();
      let thumbnail: string | null = null;
      if (stage?.toDataURL) {
        thumbnail = stage.toDataURL({
          pixelRatio: 0.6,
          mimeType: "image/png",
        });
      }

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
    }
  }

  return (
    <div className="border-b bg-white px-3 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/design-editor")}>
          <ArrowLeft size={22} />
        </Button>

        <EditableText
          value={state.fileTitle || "Novo arquivo"}
          onSave={handleSaveTitle}
          className="text-base font-medium"
        />
      </div>

      <div className="flex items-center gap-2 pr-2">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
