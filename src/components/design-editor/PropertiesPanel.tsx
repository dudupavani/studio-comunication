// src/components/design-editor/PropertiesPanel.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  PaintBucket as IconPaintBucket,
  Square as IconSquare,
  Minus as IconMinus,
  Sun as IconSun,
  Filter as IconFilter,
  Bold as IconBold,
  Italic as IconItalic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  SlidersHorizontal as IconSliders, // ⬅️ novo ícone para o dropdown de espaçamentos
} from "lucide-react";

/** Tipos que chegam do Canvas via `design-editor:selection-props` */
type SelectionCommon = {
  id: string;
  type: "rect" | "text" | "circle" | "triangle" | "line" | "star";
  name?: string;

  // comuns
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

type SelectionText = SelectionCommon & {
  type: "text";
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  width?: number;
  height?: number;
};

type SelectionProps = SelectionCommon | SelectionText;
function isText(sel: SelectionProps | null): sel is SelectionText {
  return !!sel && sel.type === "text";
}

export default function PropertiesPanel() {
  const [sel, setSel] = useState<SelectionProps | null>(null);

  // ouvir dados da seleção vindo do Canvas
  useEffect(() => {
    const onProps = (e: any) => setSel(e.detail ?? null);
    window.addEventListener(
      "design-editor:selection-props",
      onProps as EventListener
    );
    return () =>
      window.removeEventListener(
        "design-editor:selection-props",
        onProps as EventListener
      );
  }, []);

  // enviar PATCH p/ Canvas
  function updateProps(
    patch: Partial<
      Pick<
        SelectionCommon,
        | "fill"
        | "stroke"
        | "strokeWidth"
        | "opacity"
        | "shadowBlur"
        | "shadowOffsetX"
        | "shadowOffsetY"
      > & {
        // texto
        fontFamily?: string;
        fontSize?: number;
        fontStyle?: "normal" | "bold" | "italic" | "bold italic";
        align?: "left" | "center" | "right" | "justify";
        lineHeight?: number;
        letterSpacing?: number;
      }
    >
  ) {
    if (!sel) return;
    window.dispatchEvent(
      new CustomEvent("design-editor:update-props", {
        detail: { id: sel.id, patch },
      })
    );
  }

  // helpers UI
  const strokeDisabled = useMemo(() => sel?.type === "text", [sel]);
  const fillDisabled = useMemo(() => sel?.type === "line", [sel]);

  const boldActive =
    isText(sel) &&
    (sel.fontStyle === "bold" || sel.fontStyle === "bold italic");
  const italicActive =
    isText(sel) &&
    (sel.fontStyle === "italic" || sel.fontStyle === "bold italic");

  const setBold = () => {
    if (!isText(sel)) return;
    const next = boldActive
      ? italicActive
        ? ("italic" as const)
        : ("normal" as const)
      : italicActive
      ? ("bold italic" as const)
      : ("bold" as const);
    updateProps({ fontStyle: next });
  };
  const setItalic = () => {
    if (!isText(sel)) return;
    const next = italicActive
      ? boldActive
        ? ("bold" as const)
        : ("normal" as const)
      : boldActive
      ? ("bold italic" as const)
      : ("italic" as const);
    updateProps({ fontStyle: next });
  };

  if (!sel) {
    return (
      <div className="text-sm text-muted-foreground">
        Nenhum elemento selecionado.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {/* ----- Fill ----- */}
      <div className="flex items-center gap-2">
        <IconPaintBucket className="h-4 w-4 text-muted-foreground" />
        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded border"
          disabled={fillDisabled}
          title={
            fillDisabled ? "Não aplicável para linhas" : "Cor de preenchimento"
          }
          value={sel.fill ?? "#000000"}
          onChange={(e) => updateProps({ fill: e.target.value })}
        />
      </div>

      {/* ----- Stroke color ----- */}
      <div className="flex items-center gap-2">
        <IconSquare className="h-4 w-4 text-muted-foreground" />
        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded border"
          disabled={strokeDisabled}
          title={strokeDisabled ? "Texto não usa contorno" : "Cor do contorno"}
          value={sel.stroke ?? "#000000"}
          onChange={(e) => updateProps({ stroke: e.target.value })}
        />
      </div>

      {/* ----- Stroke width ----- */}
      <div className="flex items-center gap-2">
        <IconMinus className="h-4 w-4 text-muted-foreground" />
        <Input
          type="number"
          inputMode="numeric"
          className="h-8 w-20"
          min={0}
          step={1}
          disabled={strokeDisabled}
          value={sel.strokeWidth ?? 0}
          onChange={(e) =>
            updateProps({
              strokeWidth: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
      </div>

      {/* ----- Opacidade (popover) ----- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" title="Opacidade">
            <IconSun className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div className="text-sm font-medium">Opacidade</div>
            <Slider
              value={[Math.round((sel.opacity ?? 1) * 100)]}
              max={100}
              step={1}
              onValueChange={([v]) => updateProps({ opacity: v / 100 })}
            />
            <div className="text-right text-sm text-muted-foreground">
              {Math.round((sel.opacity ?? 1) * 100)}%
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* ----- Sombra (popover com 3 sliders) ----- */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" title="Sombra (blur, X, Y)">
            <IconFilter className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="start">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="text-sm font-medium">Blur</div>
              <Slider
                value={[sel.shadowBlur ?? 0]}
                max={50}
                step={1}
                onValueChange={([v]) => updateProps({ shadowBlur: v })}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium ">Offset-X</div>
              <Slider
                value={[sel.shadowOffsetX ?? 0]}
                min={-100}
                max={100}
                step={1}
                onValueChange={([v]) => updateProps({ shadowOffsetX: v })}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium ">Offset-Y</div>
              <Slider
                value={[sel.shadowOffsetY ?? 0]}
                min={-100}
                max={100}
                step={1}
                onValueChange={([v]) => updateProps({ shadowOffsetY: v })}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* ======================== TEXTO ======================== */}
      {isText(sel) && (
        <>
          {/* Fonte */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Fonte</span>
            <Input
              placeholder="Font family"
              className="h-8 w-36"
              value={sel.fontFamily ?? ""}
              onChange={(e) => updateProps({ fontFamily: e.target.value })}
            />
          </div>

          {/* Tamanho */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Tamanho</span>
            <Input
              type="number"
              inputMode="numeric"
              className="h-8 w-20"
              min={1}
              step={1}
              value={sel.fontSize ?? 16}
              onChange={(e) =>
                updateProps({
                  fontSize: Math.max(1, Number(e.target.value) || 1),
                })
              }
            />
          </div>

          {/* Bold / Italic */}
          <div className="flex items-center gap-1">
            <Button
              variant={boldActive ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Negrito"
              onClick={setBold}>
              <IconBold className="h-4 w-4" />
            </Button>
            <Button
              variant={italicActive ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Itálico"
              onClick={setItalic}>
              <IconItalic className="h-4 w-4" />
            </Button>
          </div>

          {/* Alinhamento */}
          <div className="flex items-center gap-1">
            <Button
              variant={sel.align === "left" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Alinhar à esquerda"
              onClick={() => updateProps({ align: "left" })}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={sel.align === "center" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Centralizar"
              onClick={() => updateProps({ align: "center" })}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={sel.align === "right" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Alinhar à direita"
              onClick={() => updateProps({ align: "right" })}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant={sel.align === "justify" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Justificar"
              onClick={() => updateProps({ align: "justify" })}>
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          {/* ===== Dropdown de Line-height + Letter-spacing ===== */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                title="Espaçamentos (linha e letras)">
                <IconSliders className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-6">
                {/* Line Height */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-medium">Altura da linha</div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="h-7 w-20"
                      step="0.1"
                      min="0.5"
                      value={sel.lineHeight ?? 1.2}
                      onChange={(e) =>
                        updateProps({
                          lineHeight: Math.max(
                            0.5,
                            Number(e.target.value) || 1
                          ),
                        })
                      }
                    />
                  </div>
                  <Slider
                    value={[sel.lineHeight ?? 1.2]}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onValueChange={([v]) => updateProps({ lineHeight: v })}
                  />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-medium">
                      Espaçamento entre letras
                    </div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="h-7 w-20"
                      step="0.5"
                      value={sel.letterSpacing ?? 0}
                      onChange={(e) =>
                        updateProps({
                          letterSpacing: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <Slider
                    value={[sel.letterSpacing ?? 0]}
                    min={-5}
                    max={20}
                    step={0.5}
                    onValueChange={([v]) => updateProps({ letterSpacing: v })}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}
