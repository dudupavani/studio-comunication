// src/components/design-editor/StateEmitter.tsx
"use client";

import { useEffect } from "react";
import type { AnyShape } from "@/lib/design-editor/types";

type Props = {
  shapes: AnyShape[];
  selectedId: string | null;
};

/**
 * Emite o snapshot leve do editor para o painel de camadas:
 * - selectedId
 * - lista de shapes com id/type/name/isHidden/isLocked
 */
export default function StateEmitter({ shapes, selectedId }: Props) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload = {
      selectedId,
      shapes: shapes.map((s) => ({
        id: s.id,
        type: s.type,
        name: s.name,
        isHidden: !!s.isHidden,
        isLocked: !!s.isLocked,
      })),
    };

    window.dispatchEvent(
      new CustomEvent("design-editor:state", { detail: payload })
    );
  }, [shapes, selectedId]);

  return null;
}
