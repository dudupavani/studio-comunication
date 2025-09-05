// src/components/design-editor/layers/TextLayer.tsx
"use client";

import { Layer } from "react-konva";
import type { PropsWithChildren } from "react";

type TextLayerProps = PropsWithChildren<{
  /** opcional: desligar eventos do layer em cenários específicos */
  listening?: boolean;
  /** opcional: nome para debug/inspeção */
  name?: string;
}>;

/**
 * Camada dedicada para elementos de texto.
 * Mantemos simples e genérico para não acoplar à forma como o Canvas guarda estado.
 */
export default function TextLayer({
  children,
  listening = true,
  name = "TextLayer",
}: TextLayerProps) {
  return (
    <Layer listening={listening} name={name}>
      {children}
    </Layer>
  );
}
