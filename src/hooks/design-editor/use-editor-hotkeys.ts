// src/hooks/design-editor/use-editor-hotkeys.ts
"use client";

import { useEffect } from "react";

type Props = {
  selectedId: string | null;
  onDeleteSelected: () => void;
};

// Helper local para evitar interferência dos atalhos quando o foco
// estiver em inputs/textarea/select ou elementos contenteditable/roles de texto.
function isInputLike(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;

  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;

  if (el.isContentEditable) return true;
  if (el.closest?.('[contenteditable="true"]')) return true;

  const role = el.getAttribute?.("role");
  if (role && ["textbox", "combobox", "searchbox", "spinbutton"].includes(role))
    return true;

  return false;
}

export function useEditorHotkeys({ selectedId, onDeleteSelected }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Evita conflito com campos de formulário/edição e composições IME
      if (e.defaultPrevented) return;
      if (e.isComposing) return;
      if (isInputLike(e.target)) return;

      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        onDeleteSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, onDeleteSelected]);
}
