// src/components/design-editor/types/selection.ts

export type Selection =
  | { kind: "none" }
  | { kind: "shape"; ids: string[] }
  | { kind: "image"; ids: string[] }
  | { kind: "text"; ids: string[] }
  | {
      kind: "mixed";
      shapeIds: string[];
      imageIds: string[];
      textIds?: string[];
    };

export const SelectionNone: Selection = { kind: "none" };

export function isNone(sel: Selection): sel is { kind: "none" } {
  return sel.kind === "none";
}

export function isSingle(sel: Selection): boolean {
  if (sel.kind === "shape" || sel.kind === "image" || sel.kind === "text") {
    return sel.ids.length === 1;
  }
  return false;
}

export function clear(): Selection {
  return SelectionNone;
}

export function single(
  kind: "shape" | "image" | "text",
  id: string
): Selection {
  return { kind, ids: [id] } as Selection;
}

/** Lista plana de IDs independente do kind (útil para delete em massa, por ex.) */
export function toIdList(sel: Selection): string[] {
  switch (sel.kind) {
    case "shape":
    case "image":
    case "text":
      return sel.ids;
    case "mixed":
      return [...sel.shapeIds, ...sel.imageIds, ...(sel.textIds ?? [])];
    default:
      return [];
  }
}
