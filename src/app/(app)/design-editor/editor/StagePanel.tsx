// src/app/(app)/design-editor/editor/StagePanel.tsx
"use client";

import React, { useState } from "react";
import { useEditor } from "./store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Instagram, Facebook, Linkedin } from "lucide-react";

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
  };

  const applyPreset = (pw: number, ph: number) => {
    api.setStageSize(pw, ph);
    setW(pw);
    setH(ph);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between p-2 border-b">
        <h2 className="font-medium">Stage</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fechar">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Conteúdo */}
      <div className="flex flex-col gap-2 px-3 py-4 border-b">
        <div className="flex items-center justify-between gap-1">
          <div>
            <label className="block text-xs text-muted-foreground font-medium mb-1">
              Largura
            </label>
            <Input
              type="number"
              value={w}
              onChange={(e) => setW(Number(e.target.value))}
              className="w-full"
            />
          </div>
          <div className="mt-5">
            <X size={14} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground font-medium mb-1">
              Altura
            </label>
            <Input
              type="number"
              value={h}
              onChange={(e) => setH(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>

        <Button
          className="w-full"
          onClick={applySize}
          variant="secondary"
          size="sm">
          Ok
        </Button>
      </div>

      {/* Templates de dimensões */}
      <div className="flex flex-col gap-3 p-3">
        <h3 className="text-sm font-medium mb-1">Templates Rápidos</h3>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="flex items-center justify-start gap-3 py-6 px-2"
            onClick={() => applyPreset(1080, 1080)}>
            <Instagram className="h-6 w-6" />
            <div className="flex flex-col text-left text-muted-foreground text-xs">
              <span className="font-medium">Instagram Post</span>
              <span className="font-light">1080×1080</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-3 py-6 px-2"
            onClick={() => applyPreset(1080, 1920)}>
            <Instagram className="h-6 w-6" />
            <div className="flex flex-col text-left text-muted-foreground text-xs">
              <span className="font-medium">Instagram Story</span>
              <span className="font-light">1080×1920</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-3 py-6 px-2"
            onClick={() => applyPreset(1200, 630)}>
            <Facebook className="h-6 w-6" />
            <div className="flex flex-col text-left text-muted-foreground text-xs">
              <span className="font-medium">Facebook Post</span>
              <span className="font-light">1200×630</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-3 py-6 px-2"
            onClick={() => applyPreset(820, 312)}>
            <Facebook className="h-6 w-6" />
            <div className="flex flex-col text-left text-muted-foreground text-xs">
              <span className="font-medium">Facebook Cover</span>
              <span className="font-light">820×312</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-3 py-6 px-2"
            onClick={() => applyPreset(1200, 627)}>
            <Linkedin className="h-6 w-6" />
            <div className="flex flex-col text-left text-muted-foreground text-xs">
              <span className="font-medium">LinkedIn Post</span>
              <span className="font-light">1200×627</span>
            </div>
          </Button>

          <Button
            variant="outline"
            className="flex items-center justify-start gap-3 py-6 px-2"
            onClick={() => applyPreset(1584, 396)}>
            <Linkedin className="h-6 w-6" />
            <div className="flex flex-col text-left text-muted-foreground text-xs">
              <span className="font-medium">LinkedIn Cover</span>
              <span className="font-light">1584×396</span>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
}
