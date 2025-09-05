// src/lib/design-editor/shape-factory.ts
"use client";

import { DESIGN_DEFAULTS as DEFAULTS } from "@/components/design-editor/constants/design-defaults";

import {
  AnyShape,
  ShapeKind,
  ShapeRect,
  ShapeCircle,
  ShapeTriangle,
  ShapeLine,
  ShapeStar,
  ShapeText,
} from "@/components/design-editor/types/shapes";
import { normalizeType } from "@/components/design-editor/types/shapes";

function rid(prefix: string) {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  // fallback
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Cria um shape inicial com base nos defaults centralizados */
export function createShape(type: ShapeKind, x: number, y: number): AnyShape {
  switch (normalizeType(type)) {
    case "rect":
      return {
        id: rid("rect"),
        type: "rect",
        name: "Retângulo",
        x: x - 70,
        y: y - 50,
        width: 140,
        height: 100,
        rotation: 0,
        fill: DEFAULTS.fill,
        stroke: DEFAULTS.stroke,
        strokeWidth: DEFAULTS.strokeWidth,
        opacity: DEFAULTS.opacity,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        isHidden: false,
        isLocked: false,
      } as ShapeRect;

    case "circle":
      return {
        id: rid("circle"),
        type: "circle",
        name: "Círculo",
        x,
        y,
        radius: 60,
        rotation: 0,
        fill: DEFAULTS.fill,
        stroke: DEFAULTS.stroke,
        strokeWidth: DEFAULTS.strokeWidth,
        opacity: DEFAULTS.opacity,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        isHidden: false,
        isLocked: false,
      } as ShapeCircle;

    case "triangle":
      return {
        id: rid("triangle"),
        type: "triangle",
        name: "Triângulo",
        x,
        y,
        radius: 70,
        rotation: 0,
        fill: DEFAULTS.fill,
        stroke: DEFAULTS.stroke,
        strokeWidth: DEFAULTS.strokeWidth,
        opacity: DEFAULTS.opacity,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        isHidden: false,
        isLocked: false,
      } as ShapeTriangle;

    case "line":
      return {
        id: rid("line"),
        type: "line",
        name: "Linha",
        x,
        y,
        points: [-70, 0, 70, 0],
        rotation: 0,
        stroke: DEFAULTS.line.stroke,
        strokeWidth: DEFAULTS.line.strokeWidth,
        opacity: DEFAULTS.line.opacity,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        lineCap: "round",
        isHidden: false,
        isLocked: false,
      } as ShapeLine;

    case "star":
      return {
        id: rid("star"),
        type: "star",
        name: "Estrela",
        x,
        y,
        numPoints: 5,
        innerRadius: 30,
        outerRadius: 70,
        rotation: 0,
        fill: DEFAULTS.fill,
        stroke: DEFAULTS.stroke,
        strokeWidth: DEFAULTS.strokeWidth,
        opacity: DEFAULTS.opacity,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        isHidden: false,
        isLocked: false,
      } as ShapeStar;

    default:
      return {
        id: rid("text"),
        type: "text",
        name: "Texto",
        x,
        y,
        rotation: 0,
        text: DEFAULTS.text.text,
        fontFamily: DEFAULTS.text.fontFamily,
        fontSize: DEFAULTS.text.fontSize,
        fontStyle: DEFAULTS.text.fontStyle,
        align: DEFAULTS.text.align,
        lineHeight: DEFAULTS.text.lineHeight,
        letterSpacing: DEFAULTS.text.letterSpacing,
        width: DEFAULTS.text.width,
        height: DEFAULTS.text.height,
        padding: DEFAULTS.text.padding,
        fill: DEFAULTS.text.fill,
        strokeWidth: 0,
        opacity: DEFAULTS.text.opacity,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        isHidden: false,
        isLocked: false,
      } as ShapeText;
  }
}
