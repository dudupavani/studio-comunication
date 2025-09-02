// src/components/design-editor/TextFontControl.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  const [sel, setSel] = useState<SelectionDetail | null>(selection ?? null);
  const isText = sel?.type === "text";

  // Guard “latest-only” por elemento selecionado (evita corrida entre trocas rápidas)
  const guardsRef = useRef<
    Map<string, { id: number; ctrl: AbortController | null }>
  >(new Map());

  // fontes vindas do loader (com fallback)
  const { families } = useFonts();
  const options = useMemo(() => {
    const base = (
      families && families.length ? families : FALLBACK_FONTS
    ).slice();
    if (isText && sel?.fontFamily && !base.includes(sel.fontFamily)) {
      base.unshift(sel.fontFamily); // garante valor atual na lista
    }
    return Array.from(new Set(base));
  }, [families, isText, sel?.fontFamily]);

  const currentFont = isText ? sel?.fontFamily ?? "Arial" : "";

  // 1) Atualiza pelo prop (render imediato quando painel/seleção mudam)
  useEffect(() => {
    if (selection) setSel(selection);
  }, [selection]);

  // 2) Continua ouvindo o event-bus (mudanças vindas do Canvas)
  useEffect(() => {
    const onProps = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      const detail = e.detail as SelectionDetail | null;
      setSel(detail ?? null);
    };
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

  // Aplica troca de fonte com estratégia “latest-only” por elemento
  async function handleChangeFont(nextFamily: string) {
    if (!isText || !sel?.id) return;

    const elementId = sel.id;
    const guards = guardsRef.current;
    const prev = guards.get(elementId);
    prev?.ctrl?.abort?.(); // cancela requisição anterior desse mesmo elemento

    const reqId = (prev?.id ?? 0) + 1;
    const ctrl = new AbortController();
    guards.set(elementId, { id: reqId, ctrl });

    // deduz variante (peso/estilo) a partir do estado atual
    const bold = sel.fontStyle?.includes("bold");
    const italic = sel.fontStyle?.includes("italic");
    const weight = bold ? 700 : 400;
    const style: "normal" | "italic" = italic ? "italic" : "normal";

    try {
      // 1) garante que a fonte esteja carregada (pode demorar; cancelável)
      await ensureFontLoaded(nextFamily, weight, style, ctrl.signal);

      // 2) confirma que esta ainda é a última requisição válida para este elemento
      const still = guards.get(elementId);
      if (!still || still.id !== reqId) return;

      // 3) dispara o canal oficial para atualização (Canvas aplica no nó + batchDraw)
      window.dispatchEvent(
        new CustomEvent("design-editor:update-props", {
          detail: { id: elementId, patch: { fontFamily: nextFamily } },
        })
      );
      // Compat: listeners legados
      window.dispatchEvent(
        new CustomEvent("design-editor:update-text", {
          detail: { id: elementId, patch: { fontFamily: nextFamily } },
        })
      );
    } catch (err: any) {
      if (err?.name === "AbortError") {
        // abortado por uma troca mais recente — silencioso
        return;
      }
      console.warn("TextFontControl: falha ao carregar/aplicar fonte:", err);
    } finally {
      // limpa apenas o controller, preserva id (evita regressão de corrida)
      const cur = guards.get(elementId);
      if (cur && cur.id === reqId) {
        guards.set(elementId, { id: reqId, ctrl: null });
      }
    }
  }

  // Esconde quando não for texto
  if (!isText) return null;

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
