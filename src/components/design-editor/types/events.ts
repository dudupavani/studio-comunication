// src/components/design-editor/types/events.ts

// Contrato tipado de todos os eventos do design-editor.
// Usamos 'type: string' para compat com o modelo atual; refinaremos depois.
export type EditorEventMap = {
  "design-editor:create-shape": { type: string; x?: number; y?: number };
  "design-editor:insert-image": { url: string; path?: string };
  "design-editor:select": { id: string } | { ids: string[] };
  "design-editor:delete":
    | { id?: string; ids?: string[] }
    | Record<string, never>;
  "design-editor:toggle-hidden": { id: string };
  "design-editor:toggle-locked": { id: string };
  "design-editor:bring-forward": { id: string };
  "design-editor:send-backward": { id: string };
  "design-editor:artboard:set": {
    width: number;
    height: number;
    templateId?: string;
  };

  "design-editor:state": {
    items: Array<{ id: string; kind: "shape" | "image" | "text" }>;
    selectedItemIds: string[];
  };

  "design-editor:selection-props": {
    id?: string;
    kind?: "shape" | "image" | "text" | "mixed";
    props?: Record<string, unknown>;
  };

  "design-editor:update-props": { id: string; patch: Record<string, unknown> };

  "design-editor:update-text": {
    id: string;
    patch: {
      text?: string;
      fontFamily?: string;
      fontSize?: number;
      fontStyle?: string;
      fontWeight?: number | string;
      lineHeight?: number;
      letterSpacing?: number;
      align?: "left" | "center" | "right" | "justify";
    };
  };

  "design-editor:font-loaded": {
    family: string;
    weight?: string | number;
    style?: string;
  };
  "design-editor:font-error": { family: string; reason: string };
};

// União conveniente (opcional)
export type EditorEvent<K extends keyof EditorEventMap = keyof EditorEventMap> =
  CustomEvent<EditorEventMap[K]> & { type: K };
