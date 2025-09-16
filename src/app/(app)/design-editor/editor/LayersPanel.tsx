// src/app/(app)/design-editor/editor/LayersPanel.tsx
"use client";

import { useEditor } from "./store";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

function SortableLayerItem({
  id,
  label,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, transition: { duration: 200, easing: "ease" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-9 flex items-center pl-0 pr-1 border-b text-sm select-none ${
        selected
          ? "font-medium bg-gray-200 text-primary"
          : "hover:bg-gray-100 text-gray-600 hover:text-gray-700"
      }`}>
      <span
        {...attributes}
        {...listeners}
        className="mr-1 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-3 text-gray-400" />
      </span>
      <div onClick={onSelect} className="flex-1 cursor-pointer">
        {label}
      </div>
    </div>
  );
}

export default function LayersPanel() {
  const {
    state: { order, shapes, selectedId },
    api,
  } = useEditor();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, // evita drag acidental
    })
  );

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const reversedOrder = [...order].reverse();

    const oldIndex = reversedOrder.indexOf(active.id as string);
    const newIndex = reversedOrder.indexOf(over.id as string);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newReversed = arrayMove(reversedOrder, oldIndex, newIndex);
      // inverter de volta antes de salvar no estado global
      api.setOrder(newReversed.reverse());
    }
  };

  const reversedOrder = [...order].reverse();

  return (
    <div className="flex flex-col w-full h-full border-l border-gray-200 bg-white">
      <div className="p-3 h-14 flex items-center font-semibold border-b">
        Camadas
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}>
        <SortableContext
          items={reversedOrder}
          strategy={verticalListSortingStrategy}>
          <div className="w-full overflow-y-auto">
            {reversedOrder.map((id) => (
              <SortableLayerItem
                key={id}
                id={id}
                label={getLabel(id)}
                selected={selectedId === id}
                onSelect={() => api.select(id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
