// src/components/design-editor/utils/event-bus.ts
"use client";

import type { EditorEventMap } from "../types/events";

type Unsubscribe = () => void;

export function emit<K extends keyof EditorEventMap>(
  type: K,
  detail: EditorEventMap[K]
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on<K extends keyof EditorEventMap>(
  type: K,
  handler: (e: CustomEvent<EditorEventMap[K]>) => void
): Unsubscribe {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => handler(e as CustomEvent<EditorEventMap[K]>);
  window.addEventListener(type as string, listener as EventListener);
  return () =>
    window.removeEventListener(type as string, listener as EventListener);
}
