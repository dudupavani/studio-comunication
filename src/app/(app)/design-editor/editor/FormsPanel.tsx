// src/app/(app)/design-editor/editor/FormsPanel.tsx
"use client";

import React from "react";
import { useEditor } from "./store";
import { Button } from "@/components/ui/button";
import {
  Square,
  Circle as CircleIcon,
  Triangle,
  Star as StarIcon,
  Minus,
  Pentagon,
  X,
} from "lucide-react";

export default function FormsPanel({ onClose }: { onClose: () => void }) {
  const { api } = useEditor();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-3 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold">Formas</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X size={18} />
          <span className="sr-only">Fechar painel</span>
        </Button>
      </div>

      {/* Lista em grid */}
      <div className="p-3 grid grid-cols-2 gap-2 overflow-auto">
        {/* Círculo */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-auto p-0 rounded-xl justify-center"
          onClick={() => api.addCircle()}>
          <div className="w-full p-4 flex items-center justify-center">
            <CircleIcon className="w-6 h-6" />
            <span className="sr-only">Adicionar círculo</span>
          </div>
        </Button>

        {/* Retângulo */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-auto p-0 rounded-xl justify-center"
          onClick={() => api.addRect()}>
          <div className="w-full p-4 flex items-center justify-center">
            <Square className="w-6 h-6" />
            <span className="sr-only">Adicionar retângulo</span>
          </div>
        </Button>

        {/* Triângulo */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-auto p-0 rounded-xl justify-center"
          onClick={() => api.addTriangle()}>
          <div className="w-full p-4 flex items-center justify-center">
            <Triangle className="w-6 h-6" />
            <span className="sr-only">Adicionar triângulo</span>
          </div>
        </Button>

        {/* Estrela */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-auto p-0 rounded-xl justify-center"
          onClick={() => api.addStar()}>
          <div className="w-full p-4 flex items-center justify-center">
            <StarIcon className="w-6 h-6" />
            <span className="sr-only">Adicionar estrela</span>
          </div>
        </Button>

        {/* Polígono */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-auto p-0 rounded-xl justify-center"
          onClick={() => api.addPolygon()}>
          <div className="w-full p-4 flex items-center justify-center">
            <Pentagon className="w-6 h-6" />
            <span className="sr-only">Adicionar polígono</span>
          </div>
        </Button>
      </div>
    </div>
  );
}
