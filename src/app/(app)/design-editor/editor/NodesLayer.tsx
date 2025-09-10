"use client";

import React from "react";
import { Layer } from "react-konva";

type Props = { children: React.ReactNode };

/**
 * Camada que renderiza os nós (shapes/textos).
 * É só um wrapper de <Layer>, sem lógica.
 */
export default function NodesLayer({ children }: Props) {
  return <Layer listening>{children}</Layer>;
}
