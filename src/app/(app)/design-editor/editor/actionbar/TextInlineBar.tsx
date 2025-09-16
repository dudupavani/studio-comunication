// src/app/(app)/design-editor/editor/actionbar/TextInlineBar.tsx
"use client";

import { Input } from "@/components/ui/input";
import { useEditor } from "../store";
import type { TextShape } from "../store";

type TextInlineBarProps = {
  nodeId: string;
};

export default function TextInlineBar({ nodeId }: TextInlineBarProps) {
  const { state, api } = useEditor();

  // Garante tipagem e evita bugs se o nodeId não for de texto
  const node = state.shapes[nodeId] as TextShape | undefined;
  if (!node || node.type !== "text") return null;

  const fontSize = node.fontSize ?? 16;
  const fill = node.fill ?? "#000000";

  function handleFontSizeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      api.updateShape(nodeId, { fontSize: value });
    }
  }

  function handleColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    api.updateShape(nodeId, { fill: e.target.value });
  }

  return (
    <div className="flex items-center gap-3">
      {/* Tamanho da fonte */}
      <div className="flex items-center gap-1">
        <Input
          id="font-size"
          type="number"
          min={8}
          max={300}
          step={1}
          value={fontSize}
          onChange={handleFontSizeChange}
          className="w-20 h-8"
        />
      </div>

      {/* Cor do texto */}
      <div className="flex">
        <input
          id="font-color"
          type="color"
          value={fill}
          onChange={handleColorChange}
          className="appearance-none border-none p-0 m-0 w-8 h-9  bg-transparent cursor-pointer"
          style={{ WebkitAppearance: "none" }}
        />
      </div>
    </div>
  );
}
