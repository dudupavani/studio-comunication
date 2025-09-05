// src/hooks/design-editor/use-selection-manager.ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Selection,
  clear as clearSel,
  single as singleSel,
} from "@/components/design-editor/types/selection";

type Kind = "shape" | "image" | "text";

export type SelectionManager = {
  /** Estado observável (para quem usar o hook) */
  selection: Selection;
  /** Lê o valor mais recente sem depender de re-render */
  get(): Selection;
  /** Seleção única por kind */
  select(kind: Kind, id: string): void;
  /** Alterna presença do id no kind; pode resultar em mixed/none */
  toggle(kind: Kind, id: string): void;
  /** Substitui a seleção inteira */
  replace(next: Selection): void;
  /** Limpa a seleção */
  clear(): void;
};

export function useSelectionManager(initial?: Selection): SelectionManager {
  const [selection, setSelection] = useState<Selection>(initial ?? clearSel());
  const ref = useRef(selection);
  useEffect(() => {
    ref.current = selection;
  }, [selection]);

  const get = useCallback(() => ref.current, []);

  const select = useCallback((kind: Kind, id: string) => {
    setSelection(singleSel(kind, id));
  }, []);

  const replace = useCallback((next: Selection) => {
    setSelection(next);
  }, []);

  const clear = useCallback(() => {
    setSelection(clearSel());
  }, []);

  const toggle = useCallback((kind: Kind, id: string) => {
    const s = ref.current;

    // none -> single
    if (s.kind === "none") {
      setSelection(singleSel(kind, id));
      return;
    }

    // same kind (shape|image|text)
    if (s.kind === kind) {
      const exists = s.ids.includes(id);
      const ids = exists ? s.ids.filter((x) => x !== id) : [...s.ids, id];
      setSelection(ids.length ? { kind, ids } : clearSel());
      return;
    }

    // mixed ou kind diferente -> normalizar para listas
    const lists = {
      shapeIds:
        s.kind === "mixed"
          ? [...s.shapeIds]
          : s.kind === "shape"
          ? [...s.ids]
          : [],
      imageIds:
        s.kind === "mixed"
          ? [...s.imageIds]
          : s.kind === "image"
          ? [...s.ids]
          : [],
      textIds:
        s.kind === "mixed"
          ? [...(s.textIds ?? [])]
          : s.kind === "text"
          ? [...s.ids]
          : [],
    };

    const key =
      kind === "shape" ? "shapeIds" : kind === "image" ? "imageIds" : "textIds";
    const arr = lists[key] as string[];
    const idx = arr.indexOf(id);
    if (idx >= 0) arr.splice(idx, 1);
    else arr.push(id);

    const nonEmpty = [
      ["shape", lists.shapeIds],
      ["image", lists.imageIds],
      ["text", lists.textIds],
    ] as const;

    const present = nonEmpty.filter(([, a]) => a && a.length > 0);

    if (present.length === 0) {
      setSelection(clearSel());
      return;
    }
    if (present.length === 1) {
      const [onlyKind, ids] = present[0] as [
        "shape" | "image" | "text",
        string[]
      ];
      setSelection({ kind: onlyKind, ids });
      return;
    }
    const next: any = {
      kind: "mixed",
      shapeIds: lists.shapeIds,
      imageIds: lists.imageIds,
    };
    if (lists.textIds && lists.textIds.length) next.textIds = lists.textIds;
    setSelection(next as Selection);
  }, []);

  return { selection, get, select, toggle, replace, clear };
}
