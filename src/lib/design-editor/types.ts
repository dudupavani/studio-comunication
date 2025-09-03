// src/lib/design-editor/types.ts

export type ShapeKind =
  | "rect"
  | "text"
  | "circle"
  | "triangle"
  | "line"
  | "star";

export type ShapeBase = {
  id: string;
  type: ShapeKind;
  x: number;
  y: number;
  rotation: number;
  name?: string;
  isHidden?: boolean;
  isLocked?: boolean;

  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
};

export type ShapeRect = ShapeBase & {
  type: "rect";
  width: number;
  height: number;
};

export type ShapeCircle = ShapeBase & { type: "circle"; radius: number };

export type ShapeTriangle = ShapeBase & { type: "triangle"; radius: number };

export type ShapeLine = ShapeBase & {
  type: "line";
  points: number[];
  lineCap?: "butt" | "round" | "square";
};

export type ShapeStar = ShapeBase & {
  type: "star";
  numPoints: number;
  innerRadius: number;
  outerRadius: number;
};

export type ShapeText = ShapeBase & {
  type: "text";
  text: string;
  fontFamily?: string;
  fontSize: number;
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  letterSpacing?: number;
  width?: number;
  height?: number;
  padding?: number;
};

export type AnyShape =
  | ShapeRect
  | ShapeCircle
  | ShapeTriangle
  | ShapeLine
  | ShapeStar
  | ShapeText;

export function isShapeText(s: AnyShape): s is ShapeText {
  return s.type === "text";
}
