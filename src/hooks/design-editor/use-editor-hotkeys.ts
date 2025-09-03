// src/hooks/design-editor/use-editor-hotkeys.ts
"use client";

import { useEffect } from "react";

type Props = {
  selectedId: string | null;
  onDeleteSelected: () => void;
};

export function useEditorHotkeys({ selectedId, onDeleteSelected }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // evita interferir com inputs/textarea/select/contenteditable
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isEditable =
        target?.isContentEditable ||
        tag === "input" ||
        tag === "textarea" ||
        tag === "select";

      if (isEditable) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onDeleteSelected();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, onDeleteSelected]);
}
