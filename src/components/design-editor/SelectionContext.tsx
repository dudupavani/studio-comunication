// src/components/design-editor/SelectionContext.tsx
"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import type { Selection } from "@/components/design-editor/types/selection";

type Manager = {
  get: () => Selection;
  select: (kind: "image" | "shape" | "text", id: string) => void;
  toggle: (kind: "image" | "shape" | "text", id: string) => void;
  replace: (
    payload:
      | { kind: "none" }
      | { kind: "image" | "shape" | "text"; ids: string[] }
      | {
          kind: "mixed";
          imageIds: string[];
          shapeIds: string[];
          textIds?: string[];
        }
  ) => void;
  clear: () => void;
};

type SelectionContextValue = {
  /** Estado atual da seleção (fonte única) */
  selection: Selection;
  /** Ações para atualizar/consultar a seleção */
  actions: {
    select: Manager["select"];
    toggle: Manager["toggle"];
    replace: Manager["replace"];
    clear: Manager["clear"];
    /** Acesso de leitura direta ao manager (útil para adaptadores legados) */
    get: Manager["get"];
  };
};

const SelectionContext = createContext<SelectionContextValue | null>(null);

export function SelectionProvider({
  manager,
  children,
}: {
  manager: Manager;
  children: React.ReactNode;
}) {
  const [selection, setSelection] = useState<Selection>(manager.get());

  // Enfileira uma sincronização para pós-render (microtask), evitando setState durante render.
  const syncQueued = useRef(false);
  const scheduleSync = useCallback(() => {
    if (syncQueued.current) return;
    syncQueued.current = true;

    const run = () => {
      syncQueued.current = false;
      setSelection(manager.get());
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(run);
    } else {
      Promise.resolve().then(run);
    }
  }, [manager]);

  const actions = useMemo(() => {
    return {
      select: (kind: "image" | "shape" | "text", id: string) => {
        manager.select(kind, id);
        scheduleSync();
      },
      toggle: (kind: "image" | "shape" | "text", id: string) => {
        manager.toggle(kind, id);
        scheduleSync();
      },
      replace: (
        payload:
          | { kind: "none" }
          | { kind: "image" | "shape" | "text"; ids: string[] }
          | {
              kind: "mixed";
              imageIds: string[];
              shapeIds: string[];
              textIds?: string[];
            }
      ) => {
        manager.replace(payload);
        scheduleSync();
      },
      clear: () => {
        manager.clear();
        scheduleSync();
      },
      get: manager.get,
    };
  }, [manager, scheduleSync]);

  const value = useMemo(() => ({ selection, actions }), [selection, actions]);

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useSelectionContext() {
  const ctx = useContext(SelectionContext);
  if (!ctx) {
    throw new Error(
      "useSelectionContext deve ser usado dentro de <SelectionProvider />"
    );
  }
  return ctx;
}
