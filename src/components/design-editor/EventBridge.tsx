// src/components/design-editor/EventBridge.tsx
"use client";

import { useEffect, useRef } from "react";

/**
 * Bridge centraliza:
 * - Listeners dos comandos do shell (select/delete/bring-forward/etc.)
 * - API global window.designEditor.create(...)
 * - 🔎 DEBUG opcional para eventos de fonte (update-props/font-loaded)
 */
type ShapeKind = "rect" | "text" | "circle" | "triangle" | "line" | "star";

// ✅ Payload do evento de inserção de imagem
type InsertImageDetail = { url: string; path: string };

type Props = {
  onCreate: (
    type: ShapeKind | string,
    coords?: { x?: number; y?: number }
  ) => void;
  onSelect: (id: string | null) => void;
  onDelete: (id?: string | null) => void;
  onToggleHidden: (id: string) => void;
  onToggleLocked: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  // ✅ Novo: callback opcional para inserção de imagem
  onInsertImage?: (payload: InsertImageDetail) => void;
};

export default function EventBridge({
  onCreate,
  onSelect,
  onDelete,
  onToggleHidden,
  onToggleLocked,
  onBringForward,
  onSendBackward,
  onInsertImage,
}: Props) {
  // Sequência para ordenar logs de debug
  const seqRef = useRef(0);

  // Helper para decidir se o debug está ativo (lido em tempo real)
  const isDebugOn = () =>
    typeof window !== "undefined" &&
    window?.localStorage?.getItem("design-editor:debug") === "1";

  // Console log estilizado
  const dlog = (title: string, payload: any) => {
    if (!isDebugOn()) return;
    const seq = ++seqRef.current;
    const ts = new Date().toISOString();
    // eslint-disable-next-line no-console
    console.log(
      `%c[DesignEditor %c#${seq}%c] %c${title}%c @ ${ts}`,
      "color:#64748b",
      "color:#334155;font-weight:bold",
      "color:#64748b",
      "color:#16a34a;font-weight:bold",
      "color:#64748b",
      payload
    );
  };

  useEffect(() => {
    // ===== Comandos vindos do Shell =====
    const onSelectEv = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string | null }>;
      onSelect((e.detail?.id ?? null) as string | null);
    };

    const onDeleteEv = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string | null }>;
      onDelete(e.detail?.id ?? null);
    };

    const onToggleHiddenEv = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string }>;
      if (e.detail?.id) onToggleHidden(e.detail.id);
    };

    const onToggleLockedEv = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string }>;
      if (e.detail?.id) onToggleLocked(e.detail.id);
    };

    const onBringForwardEv = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string }>;
      if (e.detail?.id) onBringForward(e.detail.id);
    };

    const onSendBackwardEv = (ev: Event) => {
      const e = ev as CustomEvent<{ id: string }>;
      if (e.detail?.id) onSendBackward(e.detail.id);
    };

    const onCreateShape = (ev: Event) => {
      const e = ev as CustomEvent<{
        type: ShapeKind | string;
        x?: number;
        y?: number;
      }>;
      onCreate(e.detail?.type ?? "text", { x: e.detail?.x, y: e.detail?.y });
    };

    // ✅ Inserção de imagem vinda do painel (ImagesPanel)
    const onInsertImageEv = (ev: Event) => {
      const e = ev as CustomEvent<InsertImageDetail>;
      if (e?.detail?.url) {
        dlog("insert-image", e.detail);
        onInsertImage?.(e.detail);
      }
    };

    window.addEventListener(
      "design-editor:select",
      onSelectEv as EventListener
    );
    window.addEventListener(
      "design-editor:delete",
      onDeleteEv as EventListener
    );
    window.addEventListener(
      "design-editor:toggle-hidden",
      onToggleHiddenEv as EventListener
    );
    window.addEventListener(
      "design-editor:toggle-locked",
      onToggleLockedEv as EventListener
    );
    window.addEventListener(
      "design-editor:bring-forward",
      onBringForwardEv as EventListener
    );
    window.addEventListener(
      "design-editor:send-backward",
      onSendBackwardEv as EventListener
    );
    window.addEventListener(
      "design-editor:create-shape",
      onCreateShape as EventListener
    );
    window.addEventListener(
      "design-editor:insert-image",
      onInsertImageEv as EventListener
    );

    // ===== API Global =====
    (globalThis as any).designEditor = {
      ...(globalThis as any).designEditor,
      create: (type: ShapeKind | string, coords?: { x?: number; y?: number }) =>
        onCreate(type, coords),
    };

    // ====== 🔎 DEBUG: timeline de eventos de fonte ======
    const onUpdateProps = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string; patch?: any }>;
      const id = e.detail?.id ?? null;
      const patch = e.detail?.patch ?? {};
      if (
        "fontFamily" in patch ||
        "fontStyle" in patch ||
        "fontSize" in patch
      ) {
        dlog("update-props", { id, patch });
      }
    };

    const onUpdateText = (ev: Event) => {
      const e = ev as CustomEvent<{ id?: string; patch?: any }>;
      const id = e.detail?.id ?? null;
      const patch = e.detail?.patch ?? {};
      if (
        "fontFamily" in patch ||
        "fontStyle" in patch ||
        "fontSize" in patch
      ) {
        dlog("update-text", { id, patch });
      }
    };

    const onFontLoaded = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      dlog("font-loaded", e.detail);
    };

    const onFontError = (ev: Event) => {
      const e = ev as CustomEvent<any>;
      dlog("font-error", e.detail);
    };

    window.addEventListener(
      "design-editor:update-props",
      onUpdateProps as EventListener
    );
    window.addEventListener(
      "design-editor:update-text",
      onUpdateText as EventListener
    );
    window.addEventListener(
      "design-editor:font-loaded",
      onFontLoaded as EventListener
    );
    window.addEventListener(
      "design-editor:font-error",
      onFontError as EventListener
    );

    // ===== Helper global p/ ligar/desligar debug sem rebuild =====
    (globalThis as any).designEditorDebug = (on?: boolean) => {
      const next =
        typeof on === "boolean"
          ? on
          : window.localStorage.getItem("design-editor:debug") !== "1";
      window.localStorage.setItem("design-editor:debug", next ? "1" : "0");
      // eslint-disable-next-line no-console
      console.info("[DesignEditor] debug =", next ? "ON" : "OFF");
    };

    return () => {
      window.removeEventListener(
        "design-editor:select",
        onSelectEv as EventListener
      );
      window.removeEventListener(
        "design-editor:delete",
        onDeleteEv as EventListener
      );
      window.removeEventListener(
        "design-editor:toggle-hidden",
        onToggleHiddenEv as EventListener
      );
      window.removeEventListener(
        "design-editor:toggle-locked",
        onToggleLockedEv as EventListener
      );
      window.removeEventListener(
        "design-editor:bring-forward",
        onBringForwardEv as EventListener
      );
      window.removeEventListener(
        "design-editor:send-backward",
        onSendBackwardEv as EventListener
      );
      window.removeEventListener(
        "design-editor:create-shape",
        onCreateShape as EventListener
      );
      window.removeEventListener(
        "design-editor:insert-image",
        onInsertImageEv as EventListener
      );

      window.removeEventListener(
        "design-editor:update-props",
        onUpdateProps as EventListener
      );
      window.removeEventListener(
        "design-editor:update-text",
        onUpdateText as EventListener
      );
      window.removeEventListener(
        "design-editor:font-loaded",
        onFontLoaded as EventListener
      );
      window.removeEventListener(
        "design-editor:font-error",
        onFontError as EventListener
      );
    };
  }, [
    onCreate,
    onSelect,
    onDelete,
    onToggleHidden,
    onToggleLocked,
    onBringForward,
    onSendBackward,
    onInsertImage,
  ]);

  return null;
}
