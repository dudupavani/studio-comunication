"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

type CoverPositionerProps = {
  src: string;
  uploading: boolean;
  onApply: (blob: Blob) => void;
  onCancel: () => void;
};

type Offset = { x: number; y: number };
type BaseSize = { w: number; h: number };

export function CoverPositioner({
  src,
  uploading,
  onApply,
  onCancel,
}: CoverPositionerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    startOX: number;
    startOY: number;
  } | null>(null);

  const [ready, setReady] = useState(false);
  const [baseSize, setBaseSize] = useState<BaseSize>({ w: 0, h: 0 });
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  const initLayout = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = cw / ch;

    let bw: number;
    let bh: number;
    if (imgAspect >= containerAspect) {
      bh = ch;
      bw = bh * imgAspect;
    } else {
      bw = cw;
      bh = bw / imgAspect;
    }

    setBaseSize({ w: bw, h: bh });
    setOffset({ x: (cw - bw) / 2, y: (ch - bh) / 2 });
    setScale(1);
    setReady(true);
  }, []);

  useEffect(() => {
    setReady(false);
    setScale(1);
  }, [src]);

  function handleMouseDown(e: React.MouseEvent) {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOX: offset.x,
      startOY: offset.y,
    };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragRef.current) return;
    const { startX, startY, startOX, startOY } = dragRef.current;
    setOffset({
      x: startOX + (e.clientX - startX),
      y: startOY + (e.clientY - startY),
    });
  }

  function handleMouseUp() {
    dragRef.current = null;
  }

  function handleTouchStart(e: React.TouchEvent) {
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startOX: offset.x,
      startOY: offset.y,
    };
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragRef.current) return;
    const touch = e.touches[0];
    const { startX, startY, startOX, startOY } = dragRef.current;
    setOffset({
      x: startOX + (touch.clientX - startX),
      y: startOY + (touch.clientY - startY),
    });
  }

  function handleTouchEnd() {
    dragRef.current = null;
  }

  function handleApply() {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    const canvas = document.createElement("canvas");
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(dpr, dpr);

    const scaledW = baseSize.w * scale;
    const scaledH = baseSize.h * scale;
    const centerX = offset.x + baseSize.w / 2;
    const centerY = offset.y + baseSize.h / 2;
    const imgLeft = centerX - scaledW / 2;
    const imgTop = centerY - scaledH / 2;

    ctx.drawImage(
      img,
      0,
      0,
      img.naturalWidth,
      img.naturalHeight,
      imgLeft,
      imgTop,
      scaledW,
      scaledH,
    );

    canvas.toBlob(
      (blob) => {
        if (blob) onApply(blob);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-72 w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt="Posicionar capa"
        onLoad={initLayout}
        style={{
          position: "absolute",
          left: offset.x,
          top: offset.y,
          width: baseSize.w,
          height: baseSize.h,
          transform: `scale(${scale})`,
          transformOrigin: "50% 50%",
          pointerEvents: "none",
        }}
      />

      {ready ? (
        <>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 bg-black/40 rounded-full px-2 py-1.5">
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[scale]}
              onValueChange={([v]) => setScale(v)}
            />
          </div>

          <div className="absolute bottom-3 right-3 flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="bg-gray-200/80"
              size="sm"
              onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="bg-gray-200/80"
              disabled={uploading}
              onClick={handleApply}>
              {uploading ? "Enviando..." : "Aplicar capa"}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
