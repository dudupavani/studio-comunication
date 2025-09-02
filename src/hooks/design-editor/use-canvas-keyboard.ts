"use client";
import { useEffect } from "react";

export function useCanvasKeyboard(opts: {
  onDelete?: () => void;
  enabled?: boolean;
}) {
  const { onDelete, enabled = true } = opts;

  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        onDelete?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, onDelete]);
}
