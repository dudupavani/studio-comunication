// src/components/design-editor/ZoomControls.tsx
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Maximize2 as IconFit } from "lucide-react";

type Props = {
  scale: number; // 1 = 100%
  onChangeScale: (s: number) => void;
  onFit: () => void;
  className?: string;
  min?: number; // ex.: 0.1 (10%)
  max?: number; // ex.: 4 (400%)
  step?: number; // ex.: 0.01
};

export default function ZoomControls({
  scale,
  onChangeScale,
  onFit,
  className = "",
  min = 0.1,
  max = 4,
  step = 0.01,
}: Props) {
  const [text, setText] = useState(() => String(Math.round(scale * 100)));

  useEffect(() => {
    setText(String(Math.round(scale * 100)));
  }, [scale]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const commitFromText = () => {
    const n = Number(String(text).replace(",", "."));
    if (!Number.isFinite(n)) return;
    onChangeScale(clamp(n / 100));
  };

  return (
    <div
      className={
        "absolute left-1 bottom-1 z-50 bg-white rounded-lg shadow px-1 py-1 flex items-center gap-3 " +
        className
      }>
      {/* Campo % */}
      <div className="flex items-center gap-1">
        <Input
          className="w-14 h-8 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitFromText}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitFromText();
          }}
          aria-label="Porcentagem de zoom"
          inputMode="numeric"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
      {/* Slider (0.1–4.0 -> 10%–400%) */}
      <div className="w-36">
        <Slider
          min={min * 100}
          max={max * 100}
          step={step * 100}
          value={[Math.round(scale * 100)]}
          onValueChange={(vals) => {
            const v = Array.isArray(vals) ? vals[0] : Number(vals);
            onChangeScale(clamp((v ?? 100) / 100));
          }}
          aria-label="Controle de zoom"
        />
      </div>

      {/* Botão Fit */}
      <Button
        variant="outline"
        size="icon-sm"
        onClick={onFit}
        title="Ajustar à tela (Fit)"
        aria-label="Ajustar à tela">
        <IconFit className="h-4 w-4" />
      </Button>
    </div>
  );
}
