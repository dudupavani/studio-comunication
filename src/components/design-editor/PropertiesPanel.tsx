// src/components/design-editor/PropertiesPanel.tsx
"use client";

import { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Download } from "lucide-react";
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
  SlidersHorizontal as IconSliders,
} from "lucide-react";
import { ensureFontLoaded } from "@/lib/design-editor/fonts/font-loader";
import TextFontControl from "./TextFontControl";
import { useSelectionContext } from "@/components/design-editor/SelectionContext";
import { useEditorState } from "@/components/design-editor/EditorStateContext";
import type {
  ShapeRect,
  ShapeCircle,
  ShapeTriangle,
  ShapeLine,
  ShapeStar,
  ShapeText,
  AnyShape,
} from "@/components/design-editor/types/shapes";

type SelectionProps =
  | (ShapeRect & { type: "rect" })
  | (ShapeCircle & { type: "circle" })
  | (ShapeTriangle & { type: "triangle" })
  | (ShapeLine & { type: "line" })
  | (ShapeStar & { type: "star" })
  | (ShapeText & { type: "text" });

function isText(sel: SelectionProps | null): sel is ShapeText {
  return !!sel && sel.type === "text";
}

export default function PropertiesPanel() {
  const { selection } = useSelectionContext();
  const { shapes, getShapeById, updateShape } = useEditorState();

  // pega o shape/text "primário" da seleção atual
  const sel: SelectionProps | null = useMemo(() => {
    if (!selection || selection.kind === "none") return null;

    const pick = (ids: string[]) => {
      const last = ids.at(-1);
      if (!last) return null;
      return (getShapeById(last) as SelectionProps | null) ?? null;
    };

    if (selection.kind === "shape" || selection.kind === "text") {
      return pick(selection.ids);
    }
    if (selection.kind === "mixed") {
      // prioriza shape/text; se não houver, não exibe painel por enquanto
      return pick([...(selection.textIds ?? []), ...selection.shapeIds]);
    }
    return null; // imagens não têm propriedades aqui
  }, [selection, getShapeById, shapes]);

  // Guard “latest-only” por elemento (sequência incremental) para fontes
  const fontSeqRef = useRef<Map<string, number>>(new Map());

  function updateProps(patch: Partial<SelectionProps>) {
    if (!sel) return;
    updateShape(sel.id, patch as Partial<AnyShape>);
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

  const setBold = async () => {
    if (!isText(sel)) return;

    const next = boldActive
      ? italicActive
        ? ("italic" as const)
        : ("normal" as const)
      : italicActive
      ? ("bold italic" as const)
      : ("bold" as const);

    const nextWeight = next.includes("bold") ? 700 : 400;
    const nextStyle: "normal" | "italic" = next.includes("italic")
      ? "italic"
      : "normal";

    if (sel.fontFamily) {
      const seq = (fontSeqRef.current.get(sel.id) ?? 0) + 1;
      fontSeqRef.current.set(sel.id, seq);

      try {
        await ensureFontLoaded(sel.fontFamily, nextWeight, nextStyle);
        if (fontSeqRef.current.get(sel.id) !== seq) return;
      } catch (err) {
        console.warn("ensureFontLoaded (bold) falhou:", err);
      }
    }

    updateProps({ fontStyle: next });
  };

  const setItalic = async () => {
    if (!isText(sel)) return;

    const next = italicActive
      ? boldActive
        ? ("bold" as const)
        : ("normal" as const)
      : boldActive
      ? ("bold italic" as const)
      : ("italic" as const);

    const nextWeight = next.includes("bold") ? 700 : 400;
    const nextStyle: "normal" | "italic" = next.includes("italic")
      ? "italic"
      : "normal";

    if (sel.fontFamily) {
      const seq = (fontSeqRef.current.get(sel.id) ?? 0) + 1;
      fontSeqRef.current.set(sel.id, seq);

      try {
        await ensureFontLoaded(sel.fontFamily, nextWeight, nextStyle);
        if (fontSeqRef.current.get(sel.id) !== seq) return;
      } catch (err) {
        console.warn("ensureFontLoaded (italic) falhou:", err);
      }
    }

    updateProps({ fontStyle: next });
  };

  // ------------------
  // RENDER
  // ------------------

  if (!sel) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant={"outline"} size={"sm"}>
            <ArrowLeft />
            Sair do editor
          </Button>
          <h3 className="text-base font-medium">Nome do arquivo</h3>
        </div>

        <div className="flex items-center gap-3">
          <Button variant={"secondary"} size={"sm"}>
            <Download size={16} />
            Baixar
          </Button>
          <Button variant={"default"} size={"sm"}>
            Salvar
          </Button>
        </div>
      </div>
    );
  }

  const s = sel;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      {/* Fill */}
      <div className="flex items-center gap-2">
        <IconPaintBucket className="h-4 w-4 text-muted-foreground" />
        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded border"
          disabled={fillDisabled}
          value={s.fill ?? "#000000"}
          onChange={(e) => updateProps({ fill: e.target.value })}
        />
      </div>

      {/* Stroke */}
      <div className="flex items-center gap-2">
        <IconSquare className="h-4 w-4 text-muted-foreground" />
        <input
          type="color"
          className="h-8 w-8 cursor-pointer rounded border"
          disabled={strokeDisabled}
          value={s.stroke ?? "#000000"}
          onChange={(e) => updateProps({ stroke: e.target.value })}
        />
      </div>

      {/* Stroke width */}
      <div className="flex items-center gap-2">
        <IconMinus className="h-4 w-4 text-muted-foreground" />
        <Input
          type="number"
          inputMode="numeric"
          className="h-8 w-20"
          min={0}
          step={1}
          disabled={strokeDisabled}
          value={s.strokeWidth ?? 0}
          onChange={(e) =>
            updateProps({
              strokeWidth: Math.max(0, Number(e.target.value) || 0),
            })
          }
        />
      </div>

      {/* Opacidade */}
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
              value={[Math.round((s.opacity ?? 1) * 100)]}
              max={100}
              step={1}
              onValueChange={([v]) => updateProps({ opacity: v / 100 })}
            />
            <div className="text-right text-sm text-muted-foreground">
              {Math.round((s.opacity ?? 1) * 100)}%
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sombra */}
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
                value={[s.shadowBlur ?? 0]}
                max={50}
                step={1}
                onValueChange={([v]) => updateProps({ shadowBlur: v })}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium ">Offset-X</div>
              <Slider
                value={[s.shadowOffsetX ?? 0]}
                min={-100}
                max={100}
                step={1}
                onValueChange={([v]) => updateProps({ shadowOffsetX: v })}
              />
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium ">Offset-Y</div>
              <Slider
                value={[s.shadowOffsetY ?? 0]}
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
      {isText(s) && (
        <>
          <TextFontControl
            selection={{
              id: s.id,
              type: s.type,
              fontFamily: s.fontFamily,
              fontStyle: s.fontStyle,
            }}
          />

          {/* Tamanho */}
          <div className="flex items-center gap-2">
            <Input
              type="number"
              inputMode="numeric"
              className="h-8 w-20"
              min={1}
              step={1}
              value={s.fontSize ?? 16}
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
              variant={s.align === "left" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Alinhar à esquerda"
              onClick={() => updateProps({ align: "left" })}>
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant={s.align === "center" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Centralizar"
              onClick={() => updateProps({ align: "center" })}>
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant={s.align === "right" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Alinhar à direita"
              onClick={() => updateProps({ align: "right" })}>
              <AlignRight className="h-4 w-4" />
            </Button>
            <Button
              variant={s.align === "justify" ? "default" : "outline"}
              size="icon"
              className="h-8 w-8"
              title="Justificar"
              onClick={() => updateProps({ align: "justify" })}>
              <AlignJustify className="h-4 w-4" />
            </Button>
          </div>

          {/* Espaçamentos (linha/letras) */}
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
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-medium">Altura da linha</div>
                    <Input
                      type="number"
                      inputMode="decimal"
                      className="h-7 w-20"
                      step="0.1"
                      min="0.5"
                      value={s.lineHeight ?? 1.2}
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
                    value={[s.lineHeight ?? 1.2]}
                    min={0.5}
                    max={3}
                    step={0.1}
                    onValueChange={([v]) => updateProps({ lineHeight: v })}
                  />
                </div>

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
                      value={s.letterSpacing ?? 0}
                      onChange={(e) =>
                        updateProps({
                          letterSpacing: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <Slider
                    value={[s.letterSpacing ?? 0]}
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
