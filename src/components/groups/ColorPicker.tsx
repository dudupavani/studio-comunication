"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const HEX = /^#[0-9A-Fa-f]{6}$/;

export const DEFAULT_SWATCHES = [
  "#EF4444", "#F97316", "#F59E0B", "#EAB308", "#84CC16",
  "#22C55E", "#10B981", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7", "#D946EF",
  "#EC4899", "#F43F5E", "#6B7280", "#94A3B8", "#0F172A",
];

export function ColorPicker({
  value,
  onChange,
  label = "Cor",
}: {
  value: string;
  onChange: (hex: string) => void;
  label?: string;
}) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);

  const valid = useMemo(() => HEX.test(hex), [hex]);

  function apply(hexColor: string) {
    if (!HEX.test(hexColor)) return;
    const up = hexColor.toUpperCase();
    onChange(up);
    setHex(up);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">{label}</label>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={valid ? hex : "#3B82F6"}
          onChange={(e) => apply(e.target.value)}
          className="h-10 flex-1 cursor-pointer p-1 rounded bg-muted border border-border hover:border-input hover:bg-accent"
        />
        <Input
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          onBlur={() => apply(hex)}
          placeholder="#RRGGBB"
          maxLength={7}
          className={valid ? "flex-1" : "flex-1 border-red-500 focus-visible:ring-red-500"}
        />
      </div>

      <div className="space-y-2 pt-4">
        <Label className="text-sm">Paleta de cores</Label>
        <div className="grid grid-cols-10 sm:grid-cols-12 gap-2">
          {DEFAULT_SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Escolher ${c}`}
              onClick={() => apply(c)}
              className="h-6 w-6 rounded border"
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
