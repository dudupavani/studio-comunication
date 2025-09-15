// src/app/(app)/design-editor/editor/StagePanel.tsx
"use client";

import React, { useState } from "react";
import { useEditor } from "./store";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export default function StagePanel({ onClose }: { onClose: () => void }) {
  const {
    state: {
      stage: { width, height },
    },
    api,
  } = useEditor();

  const [w, setW] = useState(width);
  const [h, setH] = useState(height);

  const applySize = () => {
    api.setStageSize(w, h);
    onClose();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-medium">Configuração do Stage</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Largura</label>
          <input
            type="number"
            value={w}
            onChange={(e) => setW(Number(e.target.value))}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Altura</label>
          <input
            type="number"
            value={h}
            onChange={(e) => setH(Number(e.target.value))}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        <Button className="w-full" onClick={applySize}>
          Ok
        </Button>
      </div>
    </div>
  );
}
