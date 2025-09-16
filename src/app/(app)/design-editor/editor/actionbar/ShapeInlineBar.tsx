// src/app/(app)/design-editor/editor/actionbar/ShapeInlineBar.tsx
"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEditor } from "../store";
import { PaintBucket, PenLine, Tally1, Blend, Sun } from "lucide-react";

type ShapeInlineBarProps = {
  nodeId: string;
};

export default function ShapeInlineBar({ nodeId }: ShapeInlineBarProps) {
  const { state, api } = useEditor();
  const node = state.shapes[nodeId];

  // Renderiza só para formas (não texto, não imagem)
  if (!node || node.type === "text" || node.type === "image") return null;

  const fill = (node as any).fill ?? "#111111";
  const stroke = (node as any).stroke ?? "#000000";
  const strokeWidth = (node as any).strokeWidth ?? 0;
  const opacity = (node as any).opacity ?? 1;

  // Shadow defaults
  const shadowColor = (node as any).shadowColor ?? "#000000";
  const shadowBlur = (node as any).shadowBlur ?? 0;
  const shadowOffsetX = (node as any).shadowOffsetX ?? 0;
  const shadowOffsetY = (node as any).shadowOffsetY ?? 0;
  const shadowOpacity = (node as any).shadowOpacity ?? 0.5;

  // Handlers
  function handleFill(e: React.ChangeEvent<HTMLInputElement>) {
    api.updateShape(nodeId, { fill: e.target.value });
  }
  function handleStroke(e: React.ChangeEvent<HTMLInputElement>) {
    api.updateShape(nodeId, { stroke: e.target.value });
  }
  function handleStrokeWidth(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    if (!isNaN(v)) api.updateShape(nodeId, { strokeWidth: v });
  }
  function handleOpacity(e: React.ChangeEvent<HTMLInputElement>) {
    const v = Math.max(0, Math.min(1, parseFloat(e.target.value)));
    if (!isNaN(v)) api.updateShape(nodeId, { ...({ opacity: v } as any) });
  }

  // Shadow handlers
  const handleShadowColor = (e: React.ChangeEvent<HTMLInputElement>) =>
    api.updateShape(nodeId, { shadowColor: e.target.value });

  const handleShadowBlur = (v: number) =>
    api.updateShape(nodeId, { ...({ shadowBlur: v } as any) });

  const handleShadowOffsetX = (v: number) =>
    api.updateShape(nodeId, { ...({ shadowOffsetX: v } as any) });

  const handleShadowOffsetY = (v: number) =>
    api.updateShape(nodeId, { ...({ shadowOffsetY: v } as any) });

  const handleShadowOpacity = (v: number) =>
    api.updateShape(nodeId, { ...({ shadowOpacity: v } as any) });

  return (
    <div className="flex items-center gap-4">
      {/* Fill */}
      <div className="flex items-center gap-1 border rounded-sm px-2">
        <PaintBucket size={16} className="text-gray-600" />
        <input
          id="shape-fill"
          type="color"
          value={fill}
          onChange={handleFill}
          className="appearance-none border-none p-0 m-0 w-8 h-8 bg-transparent cursor-pointer"
          style={{ WebkitAppearance: "none" }}
        />
      </div>

      {/* Stroke */}
      <div className="flex items-center gap-1 border rounded-sm px-2">
        <PenLine size={16} className="text-gray-600" />
        <input
          id="shape-stroke"
          type="color"
          value={stroke}
          onChange={handleStroke}
          disabled={strokeWidth < 1}
          className={`appearance-none border-none p-0 m-0 w-8 h-8 bg-transparent cursor-pointer ${
            strokeWidth < 1 ? "opacity-40" : ""
          }`}
          style={{ WebkitAppearance: "none" }}
        />
      </div>

      {/* Stroke Width */}
      <div className="flex items-center">
        <Tally1 size={18} className="text-gray-600" />
        <Input
          id="shape-strokeWidth"
          type="number"
          min={0}
          max={200}
          step={1}
          value={strokeWidth}
          onChange={handleStrokeWidth}
          className="w-16 h-8"
        />
      </div>

      {/* Opacity */}
      <div className="flex items-center gap-2">
        <Blend size={18} />
        <Input
          id="shape-opacity"
          type="number"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={handleOpacity}
          className="w-16 h-8"
        />
      </div>

      {/* Shadow dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="border rounded-sm px-2 py-1 flex items-center">
            <Sun size={16} className="text-gray-600" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="p-3 w-72 space-y-4">
          {/* Cor */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Cor</span>
            <input
              type="color"
              value={shadowColor}
              onChange={handleShadowColor}
              className="appearance-none border-none p-0 m-0 w-8 h-8 bg-transparent cursor-pointer"
              style={{ WebkitAppearance: "none" }}
            />
          </div>

          {/* Blur */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Blur</span>
            <Slider
              value={[shadowBlur]}
              min={0}
              max={100}
              step={1}
              onValueChange={([v]) => handleShadowBlur(v)}
              className="flex-1"
            />
            <Input
              type="number"
              value={shadowBlur}
              min={0}
              max={100}
              step={1}
              onChange={(e) => handleShadowBlur(parseInt(e.target.value) || 0)}
              className="w-16 h-8"
            />
          </div>

          {/* Offset X */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Offset X</span>
            <Slider
              value={[shadowOffsetX]}
              min={-200}
              max={200}
              step={1}
              onValueChange={([v]) => handleShadowOffsetX(v)}
              className="flex-1"
            />
            <Input
              type="number"
              value={shadowOffsetX}
              onChange={(e) =>
                handleShadowOffsetX(parseInt(e.target.value) || 0)
              }
              className="w-16 h-8"
            />
          </div>

          {/* Offset Y */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Offset Y</span>
            <Slider
              value={[shadowOffsetY]}
              min={-200}
              max={200}
              step={1}
              onValueChange={([v]) => handleShadowOffsetY(v)}
              className="flex-1"
            />
            <Input
              type="number"
              value={shadowOffsetY}
              onChange={(e) =>
                handleShadowOffsetY(parseInt(e.target.value) || 0)
              }
              className="w-16 h-8"
            />
          </div>

          {/* Shadow opacity */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">Opacidade</span>
            <Slider
              value={[shadowOpacity]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={([v]) => handleShadowOpacity(v)}
              className="flex-1"
            />
            <Input
              type="number"
              value={shadowOpacity}
              min={0}
              max={1}
              step={0.05}
              onChange={(e) =>
                handleShadowOpacity(
                  Math.max(0, Math.min(1, parseFloat(e.target.value) || 0))
                )
              }
              className="w-16 h-8"
            />
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
