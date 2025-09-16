// src/app/(app)/design-editor/editor/LayersPanel.tsx
"use client";

import { useEditor } from "./store";

export default function LayersPanel() {
  const {
    state: { order, shapes, selectedId },
    api,
  } = useEditor();

  const getLabel = (id: string) => {
    const shape = shapes[id];
    if (!shape) return "Elemento";

    switch (shape.type) {
      case "text":
        return "Texto";
      case "image":
        return "Imagem";
      case "rect":
        return "Retângulo";
      case "circle":
        return "Círculo";
      case "triangle":
        return "Triângulo";
      case "star":
        return "Estrela";
      default:
        return shape.type ?? "Elemento";
    }
  };

  return (
    <div className="flex flex-col w-full h-full border-l border-gray-200 bg-white">
      <div className="p-3 h-14 flex items-center font-semibold border-b">
        Camadas
      </div>
      <div className="w-full overflow-y-auto">
        {order.map((id) => (
          <div
            key={id}
            onClick={() => api.selectId(id)}
            className={`h-9 flex items-center px-2 py-1 border-b cursor-pointer text-sm ${
              selectedId === id ? "bg-muted font-medium" : "hover:bg-gray-100"
            }`}>
            {getLabel(id)}
          </div>
        ))}
      </div>
    </div>
  );
}
