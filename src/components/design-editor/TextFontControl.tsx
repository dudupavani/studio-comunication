// src/components/design-editor/TextFontControl.tsx
"use client";

import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useFonts,
  ensureFontLoaded,
} from "@/lib/design-editor/fonts/font-loader";
import { useEditorState } from "@/components/design-editor/EditorStateContext";

type FontStyle = "normal" | "bold" | "italic" | "bold italic";

type SelectionDetail = {
  id: string;
  type: "text" | "rect" | "circle" | "triangle" | "line" | "star";
  fontFamily?: string;
  fontStyle?: FontStyle;
};

type Props = {
  /** Seleção atual vinda do painel (garante render imediato). */
  selection?: SelectionDetail | null;
};

// Fallback local caso o font-loader ainda não tenha carregado famílias
const FALLBACK_FONTS = [
  "Arial",
  "Inter",
  "Roboto",
  "Poppins",
  "Montserrat",
  "Lato",
  "Open Sans",
  "Oswald",
  "Times New Roman",
  "Georgia",
  "Courier New",
];

export default function TextFontControl({ selection }: Props) {
  const { updateShape } = useEditorState();
  const { families } = useFonts();

  const options = (() => {
    const base = (
      families && families.length ? families : FALLBACK_FONTS
    ).slice();
    if (
      selection?.type === "text" &&
      selection.fontFamily &&
      !base.includes(selection.fontFamily)
    ) {
      base.unshift(selection.fontFamily);
    }
    return Array.from(new Set(base));
  })();

  const currentFont =
    selection?.type === "text" ? selection.fontFamily ?? "Arial" : "";

  // 🔒 Guarda “latest-only” por elemento para evitar corrida entre trocas rápidas
  const fontGuardsRef = useRef<
    Map<string, { id: number; ctrl: AbortController | null }>
  >(new Map());

  async function handleChangeFont(value: string) {
    if (selection?.type !== "text" || !selection?.id) return;

    // deduz variante (peso/estilo) a partir do estado atual
    const bold = selection.fontStyle?.includes("bold");
    const italic = selection.fontStyle?.includes("italic");
    const weight = bold ? 700 : 400;
    const style: "normal" | "italic" = italic ? "italic" : "normal";

    // latest-only: cancela a requisição anterior para o mesmo elemento
    const elementId = selection.id;
    const guards = fontGuardsRef.current;
    const prev = guards.get(elementId);
    prev?.ctrl?.abort?.();

    const reqId = (prev?.id ?? 0) + 1;
    const ctrl = new AbortController();
    guards.set(elementId, { id: reqId, ctrl });

    try {
      await ensureFontLoaded(value, weight, style, ctrl.signal);

      // Ainda é a requisição mais recente?
      const still = guards.get(elementId);
      if (!still || still.id !== reqId) return;

      updateShape(selection.id, { fontFamily: value });
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        console.warn("TextFontControl: ensureFontLoaded error", err);
      }
    } finally {
      const cur = guards.get(elementId);
      if (cur && cur.id === reqId)
        guards.set(elementId, { id: reqId, ctrl: null });
    }
  }

  // Esconde quando não for texto
  if (selection?.type !== "text") return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Select value={currentFont} onValueChange={handleChangeFont}>
        <SelectTrigger className="h-8 w-44">
          <SelectValue placeholder="Fonte" />
        </SelectTrigger>
        <SelectContent>
          {options.map((f) => (
            <SelectItem key={f} value={f}>
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
