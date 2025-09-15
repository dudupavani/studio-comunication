// src/app/(app)/design-editor/editor/nodes/registry.ts
import type { ComponentType } from "react";
import RectNode from "./shapes/RectNode";
import CircleNode from "./shapes/CircleNode";
import TriangleNode from "./shapes/TriangleNode";
import StarNode from "./shapes/StarNode";
import RegularPolygonNode from "./shapes/RegularPolygonNode";
import ImageNode from "./shapes/ImageNode";

export type ShapeType =
  | "rect"
  | "circle"
  | "triangle"
  | "star"
  | "polygon"
  | "image"; // novo

/**
 * Chaves de políticas que o Transformer/Layer podem consumir
 * para decidir âncoras, proporção, etc.
 */
export type PolicyKey =
  | "keepRatio" // mantém proporção 1:1 durante transformações
  | "hideTopBottomCenters" // esconde anchors top-center/bottom-center
  | "supportsRotation" // permite rotação
  | "supportsStroke" // aceita propriedades de stroke
  | "supportsShadow"; // aceita propriedades de sombra

/**
 * Entrada de registro de uma forma geométrica.
 * Mantemos Props genérico (any) para não acoplar aqui à assinatura dos Nodes.
 */
export type ShapeRegistryEntry<Props = any> = {
  type: ShapeType;
  Component: ComponentType<Props>;
  /**
   * Lista de políticas consumidas pelo TransformerLayer e afins.
   */
  policyKeys: ReadonlyArray<PolicyKey>;
  /**
   * Capacidades usadas por menus/guards (drag, resize, rotate).
   */
  capabilities?: {
    draggable?: boolean;
    resizable?: boolean;
    rotatable?: boolean;
  };
};

/**
 * Registro parcial apenas de SHAPES (formas geométricas).
 */
export type ShapesRegistry = Record<ShapeType, ShapeRegistryEntry>;

export const shapesRegistry: ShapesRegistry = {
  rect: {
    type: "rect",
    Component: RectNode as unknown as ComponentType<any>,
    policyKeys: ["supportsRotation", "supportsStroke", "supportsShadow"],
    capabilities: { draggable: true, resizable: true, rotatable: true },
  },
  circle: {
    type: "circle",
    Component: CircleNode as unknown as ComponentType<any>,
    policyKeys: [
      "keepRatio",
      "hideTopBottomCenters",
      "supportsRotation",
      "supportsStroke",
      "supportsShadow",
    ],
    capabilities: { draggable: true, resizable: true, rotatable: true },
  },
  triangle: {
    type: "triangle",
    Component: TriangleNode as unknown as ComponentType<any>,
    policyKeys: ["supportsRotation", "supportsStroke", "supportsShadow"],
    capabilities: { draggable: true, resizable: true, rotatable: true },
  },
  polygon: {
    type: "polygon",
    Component: RegularPolygonNode,
    policyKeys: ["supportsRotation", "supportsStroke", "supportsShadow"],
    capabilities: { draggable: true, resizable: true, rotatable: true },
  },
  star: {
    type: "star",
    Component: StarNode as unknown as ComponentType<any>,
    policyKeys: ["supportsRotation", "supportsStroke", "supportsShadow"],
    capabilities: { draggable: true, resizable: true, rotatable: true },
  },
  image: {
    type: "image",
    Component: ImageNode as unknown as ComponentType<any>,
    policyKeys: ["supportsRotation", "supportsShadow"],
    capabilities: { draggable: true, resizable: true, rotatable: true },
  },
} as const;

/**
 * Helper de acesso seguro em runtime.
 */
export function getShapeEntry(type: ShapeType): ShapeRegistryEntry {
  const entry = shapesRegistry[type];
  if (!entry) {
    throw new Error(`[shapesRegistry] Unknown shape type: "${type}"`);
  }
  return entry;
}

/**
 * Type guard para saber se um "type" pertence ao conjunto de shapes.
 */
export function isShapeType(type: string): type is ShapeType {
  return type in shapesRegistry;
}

/**
 * Lista conveniente para menus/dropdowns.
 */
export const shapeTypes: ShapeType[] = Object.keys(
  shapesRegistry
) as ShapeType[];
