// src/hooks/design-editor/use-artboard.ts
"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_ARTBOARD,
  type ArtboardTemplate,
} from "@/lib/design-editor/artboard-templates";

export type ArtboardState = {
  templateId: string;
  width: number;
  height: number;
};

type SetSizeArgs = { width: number; height: number; templateId?: string };

export function useArtboard(initial?: Partial<ArtboardState>) {
  const [artboard, setArtboard] = useState<ArtboardState>({
    templateId: initial?.templateId ?? DEFAULT_ARTBOARD.id,
    width: initial?.width ?? DEFAULT_ARTBOARD.width,
    height: initial?.height ?? DEFAULT_ARTBOARD.height,
  });

  // Aplicar um template (ex.: vindo da UI de Templates)
  const applyTemplate = useCallback((tpl: ArtboardTemplate) => {
    setArtboard({
      templateId: tpl.id,
      width: tpl.width,
      height: tpl.height,
    });
  }, []);

  // Definir tamanho custom (mantém templateId="custom" por padrão)
  const setSize = useCallback((args: SetSizeArgs) => {
    const w = Number(args.width);
    const h = Number(args.height);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;

    setArtboard((prev) => ({
      templateId: args.templateId ?? "custom",
      width: w,
      height: h,
    }));
  }, []);

  // Ouvir eventos globais disparados pelo TemplatesPanel
  useEffect(() => {
    const onSet = (e: Event) => {
      const { templateId, width, height } = (e as CustomEvent).detail ?? {};
      const w = Number(width);
      const h = Number(height);
      if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0)
        return;

      setArtboard({
        templateId: String(templateId ?? "custom"),
        width: w,
        height: h,
      });
    };

    window.addEventListener(
      "design-editor:artboard:set",
      onSet as EventListener
    );
    return () => {
      window.removeEventListener(
        "design-editor:artboard:set",
        onSet as EventListener
      );
    };
  }, []);

  return { artboard, setArtboard, applyTemplate, setSize };
}
