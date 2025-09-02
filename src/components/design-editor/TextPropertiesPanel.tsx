// src/components/design-editor/TextPropertiesPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TextFontControl from "./TextFontControl"; // ✅ usamos o componente que funciona

type Align = "left" | "center" | "right" | "justify";
type FontStyle = "normal" | "bold" | "italic" | "bold italic";

type SelectionTextProps = {
  id: string;
  type: "text";
  name: string;

  // comuns
  fill?: string;
  opacity: number;
  shadowBlur: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  // específicos de texto
  text: string;
  fontFamily?: string;
  fontSize: number;
  fontStyle?: FontStyle;
  align?: Align;
  lineHeight?: number;
  letterSpacing?: number;
  padding?: number;
  width?: number; // wrap
  height?: number; // informativo
};

export default function TextPropertiesPanel() {
  const [state, setState] = useState<SelectionTextProps | null>(null);

  // Ouve a seleção atual vinda do Canvas
  useEffect(() => {
    const onSelectionProps = (e: any) => {
      const detail = e.detail as any;
      if (!detail || detail.type !== "text") {
        setState(null);
      } else {
        setState(detail as SelectionTextProps);
      }
    };
    window.addEventListener(
      "design-editor:selection-props",
      onSelectionProps as EventListener
    );
    return () =>
      window.removeEventListener(
        "design-editor:selection-props",
        onSelectionProps as EventListener
      );
  }, []);

  // Mantemos o canal original do painel para os demais campos
  function update(patch: Partial<SelectionTextProps>) {
    if (!state?.id) return;
    const { id, type, name, ...safe } = patch as any;
    window.dispatchEvent(
      new CustomEvent("design-editor:update-props", {
        detail: { id: state.id, patch: safe },
      })
    );
  }

  if (!state) {
    return (
      <div className="text-sm text-muted-foreground h-full flex items-center">
        Selecione um texto para editar propriedades de tipografia e conteúdo.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start">
      {/* Conteúdo */}
      <div className="md:col-span-2">
        <Label htmlFor="txt-content" className="text-[11px]">
          Conteúdo
        </Label>
        <textarea
          id="txt-content"
          className="mt-1 w-full h-[72px] border rounded-md px-2 py-1 text-sm"
          value={state.text}
          onChange={(e) => {
            const text = e.target.value;
            setState((s) => (s ? { ...s, text } : s));
            update({ text });
          }}
        />
      </div>

      {/* Fonte (usando o componente que já funciona) */}
      <div className="flex flex-col">
        <Label className="text-[11px]">Fonte</Label>
        <TextFontControl 
          selection={state ? {
            id: state.id,
            type: state.type,
            fontFamily: state.fontFamily,
            fontStyle: state.fontStyle,
          } : null}
        />
      </div>

      {/* Tamanho */}
      <div className="flex flex-col">
        <Label htmlFor="txt-size" className="text-[11px]">
          Tamanho
        </Label>
        <Input
          id="txt-size"
          type="number"
          className="h-8"
          min={1}
          step={1}
          value={state.fontSize}
          onChange={(e) => {
            const fontSize = Math.max(1, Number(e.target.value) || 1);
            setState((s) => (s ? { ...s, fontSize } : s));
            update({ fontSize });
          }}
        />
      </div>

      {/* Estilo */}
      <div className="flex flex-col">
        <Label htmlFor="txt-style" className="text-[11px]">
          Estilo
        </Label>
        <select
          id="txt-style"
          className="h-8 border rounded-md px-2 text-sm"
          value={state.fontStyle ?? "normal"}
          onChange={(e) => {
            const fontStyle = e.target.value as FontStyle;
            setState((s) => (s ? { ...s, fontStyle } : s));
            update({ fontStyle });
          }}>
          <option value="normal">Normal</option>
          <option value="bold">Negrito</option>
          <option value="italic">Itálico</option>
          <option value="bold italic">Negrito + Itálico</option>
        </select>
      </div>

      {/* Alinhamento */}
      <div className="flex flex-col">
        <Label htmlFor="txt-align" className="text-[11px]">
          Alinhamento
        </Label>
        <select
          id="txt-align"
          className="h-8 border rounded-md px-2 text-sm"
          value={state.align ?? "left"}
          onChange={(e) => {
            const align = e.target.value as Align;
            setState((s) => (s ? { ...s, align } : s));
            update({ align });
          }}>
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
          <option value="justify">Justificado</option>
        </select>
      </div>

      {/* Largura (wrap) */}
      <div className="flex flex-col">
        <Label htmlFor="txt-width" className="text-[11px]">
          Largura (wrap)
        </Label>
        <Input
          id="txt-width"
          type="number"
          className="h-8"
          min={20}
          step={5}
          value={state.width ?? 240}
          onChange={(e) => {
            const width = Math.max(20, Number(e.target.value) || 20);
            setState((s) => (s ? { ...s, width } : s));
            update({ width });
          }}
        />
      </div>

      {/* Altura (informativo) */}
      <div className="flex flex-col">
        <Label className="text-[11px]">Altura</Label>
        <Input disabled className="h-8" value={state.height ?? 40} />
      </div>

      {/* Line height */}
      <div className="flex flex-col">
        <Label htmlFor="txt-lh" className="text-[11px]">
          Line height
        </Label>
        <Input
          id="txt-lh"
          type="number"
          className="h-8"
          min={0.5}
          step={0.1}
          value={state.lineHeight ?? 1.2}
          onChange={(e) => {
            const lineHeight = Math.max(0.5, Number(e.target.value) || 1);
            setState((s) => (s ? { ...s, lineHeight } : s));
            update({ lineHeight });
          }}
        />
      </div>

      {/* Letter spacing */}
      <div className="flex flex-col">
        <Label htmlFor="txt-ls" className="text-[11px]">
          Espaço letras
        </Label>
        <Input
          id="txt-ls"
          type="number"
          className="h-8"
          step={0.5}
          value={state.letterSpacing ?? 0}
          onChange={(e) => {
            const letterSpacing = Number(e.target.value) || 0;
            setState((s) => (s ? { ...s, letterSpacing } : s));
            update({ letterSpacing });
          }}
        />
      </div>

      {/* Padding interno */}
      <div className="flex flex-col">
        <Label htmlFor="txt-pad" className="text-[11px]">
          Padding
        </Label>
        <Input
          id="txt-pad"
          type="number"
          className="h-8"
          min={0}
          step={1}
          value={state.padding ?? 0}
          onChange={(e) => {
            const padding = Math.max(0, Number(e.target.value) || 0);
            setState((s) => (s ? { ...s, padding } : s));
            update({ padding });
          }}
        />
      </div>

      {/* Dica */}
      <div className="md:col-span-6 text-[11px] text-muted-foreground">
        Dica: ajuste a <b>Largura</b> para controlar a quebra de linha do texto.
      </div>
    </div>
  );
}
