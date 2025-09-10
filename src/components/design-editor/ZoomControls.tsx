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
  // Estado do campo de texto (%)
  const [text, setText] = useState(() => String(Math.round(scale * 100)));
  // Estado CONTROLADO do slider (em %)
  const [sliderValue, setSliderValue] = useState(() => Math.round(scale * 100));
  // Flag para evitar “ping-pong” enquanto o usuário está arrastando
  const [isSliding, setIsSliding] = useState(false);

  // Quando o scale externo mudar (por Fit, ou commit do próprio slider),
  // refletimos nos controles — mas só se não estamos no meio do drag.
  useEffect(() => {
    if (!isSliding) {
      const pct = Math.round(scale * 100);
      setSliderValue(pct);
      setText(String(pct));
    }
  }, [scale, isSliding]);

  const clampScale = (s: number) => Math.min(max, Math.max(min, s));
  const clampPct = (pct: number) =>
    Math.round(Math.min(max * 100, Math.max(min * 100, pct)));

  const commitFromText = () => {
    const n = Number(String(text).replace(",", "."));
    if (!Number.isFinite(n)) return;
    const pct = clampPct(n);
    setSliderValue(pct); // mantém slider sincronizado
    onChangeScale(clampScale(pct / 100));
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

      {/* Slider (10%–400%) — CONTROLADO */}
      <div className="w-36">
        <Slider
          min={min * 100}
          max={max * 100}
          step={step * 100}
          value={[sliderValue]} // CONTROLADO
          onValueChange={(vals) => {
            const v = Array.isArray(vals) ? vals[0] : Number(vals);
            setIsSliding(true);
            const pct = clampPct(v ?? 100);
            setSliderValue(pct);
            setText(String(pct)); // feedback imediato no input
          }}
          onValueCommit={(vals) => {
            const v = Array.isArray(vals) ? vals[0] : Number(vals);
            const pct = clampPct(v ?? 100);
            setIsSliding(false);
            setSliderValue(pct);
            onChangeScale(clampScale(pct / 100)); // só comita ao soltar
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
