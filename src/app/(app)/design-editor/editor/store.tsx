// src/app/(app)/design-editor/editor/store.tsx
"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useRef,
} from "react";

/** =======================
 *  Tipos (uniões discriminadas)
 *  ======================= */
export type ShapeKind =
  | "rect"
  | "circle"
  | "triangle"
  | "star"
  | "polygon"
  | "text"
  | "image";

type CommonShape = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  draggable: boolean;
};

export type RectShape = CommonShape & { type: "rect" };
export type CircleShape = CommonShape & { type: "circle" };
export type TriangleShape = CommonShape & { type: "triangle" };
export type StarShape = CommonShape & { type: "star"; numPoints: number };
export type PolygonShape = CommonShape & { type: "polygon"; sides: number };

export type TextShape = CommonShape & {
  type: "text";
  text: string;
  fontSize: number;
  fontFamily: string;
  fontStyle?: string;
  align?: "left" | "center" | "right";
};

export type ImageShape = {
  id: string;
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  draggable: boolean;
  src: string; // URL da imagem (Supabase signed URL)
};

export type Shape =
  | RectShape
  | CircleShape
  | TriangleShape
  | StarShape
  | PolygonShape
  | TextShape
  | ImageShape;

export type ShapePatch = Partial<Shape>;

export type EditorState = {
  shapes: Record<string, Shape>;
  order: string[];
  selectedId: string | null;
  selectedIds: string[];
  editingId: string | null;
  stage: { width: number; height: number; background: string };
  fileTitle: string;
};

/** =======================
 *  Ações
 *  ======================= */
type Action =
  | { type: "ADD_SHAPE"; payload: Shape }
  | { type: "UPDATE_SHAPE"; id: string; patch: ShapePatch }
  | { type: "SELECT"; id: string | null }
  | { type: "SELECT_ONE"; id: string | null }
  | { type: "TOGGLE_SELECT"; id: string }
  | { type: "CLEAR_SELECTION" }
  | { type: "SELECT_MANY"; ids: string[] }
  | { type: "DELETE_SELECTED" }
  | { type: "SET_STAGE_SIZE"; width: number; height: number }
  | { type: "START_EDIT_TEXT"; id: string }
  | { type: "END_EDIT_TEXT" }
  | { type: "SET_FILE_TITLE"; title: string };

function genId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${(crypto as any).randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function uniqStable<T>(arr: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const v of arr) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

function shapeIsText(s: Shape | undefined): s is TextShape {
  return !!s && s.type === "text";
}

/** =======================
 *  Estado inicial
 *  ======================= */
const initialState: EditorState = {
  shapes: {},
  order: [],
  selectedId: null,
  selectedIds: [],
  editingId: null,
  stage: { width: 700, height: 700, background: "#ffffff" },
  fileTitle: "Novo arquivo",
};

/** =======================
 *  Reducer
 *  ======================= */
function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "ADD_SHAPE": {
      const s = action.payload;
      return {
        ...state,
        shapes: { ...state.shapes, [s.id]: s },
        order: [...state.order, s.id],
        selectedIds: [s.id],
        selectedId: s.id,
        editingId: s.type === "text" ? s.id : null,
      };
    }
    case "UPDATE_SHAPE": {
      if (!state.shapes[action.id]) return state;
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: { ...state.shapes[action.id], ...action.patch } as Shape,
        },
      };
    }
    case "SELECT":
      return reducer(state, { type: "SELECT_ONE", id: action.id });
    case "SELECT_ONE": {
      const id = action.id;
      const selectedIds = id ? [id] : [];
      const single = selectedIds.length === 1;
      const theShape = single ? state.shapes[selectedIds[0]!] : undefined;
      return {
        ...state,
        selectedIds,
        selectedId: id ?? null,
        editingId: single && shapeIsText(theShape) ? state.editingId : null,
      };
    }
    case "TOGGLE_SELECT": {
      const id = action.id;
      const exists = state.selectedIds.includes(id);
      const selectedIds = exists
        ? state.selectedIds.filter((x) => x !== id)
        : [...state.selectedIds, id];
      return {
        ...state,
        selectedIds,
        selectedId: selectedIds.length > 0 ? selectedIds[0] : null,
        editingId: null,
      };
    }
    case "CLEAR_SELECTION":
      return { ...state, selectedIds: [], selectedId: null, editingId: null };
    case "SELECT_MANY": {
      const ids = uniqStable(action.ids);
      return {
        ...state,
        selectedIds: ids,
        selectedId: ids.length > 0 ? ids[0] : null,
        editingId: null,
      };
    }
    case "DELETE_SELECTED": {
      const ids = state.selectedIds.length > 0 ? state.selectedIds : [];
      if (ids.length === 0) return state;
      const shapes = { ...state.shapes };
      for (const id of ids) delete shapes[id];
      return {
        ...state,
        shapes,
        order: state.order.filter((k) => !ids.includes(k)),
        selectedIds: [],
        selectedId: null,
        editingId: null,
      };
    }
    case "SET_STAGE_SIZE":
      return {
        ...state,
        stage: { ...state.stage, width: action.width, height: action.height },
      };
    case "START_EDIT_TEXT":
      if (
        state.selectedIds.length === 1 &&
        state.selectedIds[0] === action.id
      ) {
        return { ...state, editingId: action.id, selectedId: action.id };
      }
      return state;
    case "END_EDIT_TEXT":
      return { ...state, editingId: null };
    case "SET_FILE_TITLE":
      return { ...state, fileTitle: action.title };
    default:
      return state;
  }
}

/** =======================
 *  Contexto e Provider
 *  ======================= */
const EditorCtx = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<Action>;
  api: any;
} | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // 🔹 instância atual do Konva.Stage
  const stageRef = useRef<any>(null);

  const api = useMemo(() => {
    return {
      // ===== Persistência =====
      toJSON: () => {
        return {
          shapes: state.shapes,
          order: state.order,
          stage: state.stage,
          fileTitle: state.fileTitle,
        };
      },

      loadFromJSON: (data: any) => {
        if (!data) return;
        dispatch({ type: "CLEAR_SELECTION" });
        if (data.shapes && data.order) {
          for (const id of data.order) {
            if (data.shapes[id]) {
              dispatch({ type: "ADD_SHAPE", payload: data.shapes[id] });
            }
          }
        }
        if (data.stage) {
          dispatch({
            type: "SET_STAGE_SIZE",
            width: data.stage.width,
            height: data.stage.height,
          });
          state.stage.background = data.stage.background ?? "#ffffff";
        }
        if (data.fileTitle) {
          dispatch({ type: "SET_FILE_TITLE", title: data.fileTitle });
        }
      },

      // ===== Stage instance (thumbnail/export) =====
      setStageRef: (instance: any) => {
        stageRef.current = instance;
      },
      getStageRef: (): any | null => stageRef.current ?? null,
      getStageJSON: (): string | null => stageRef.current?.toJSON?.() ?? null,

      // ===== File title =====
      setFileTitle: (title: string) =>
        dispatch({ type: "SET_FILE_TITLE", title }),

      // ===== Shapes =====
      addRect: () => {
        const id = genId("rect");
        const shape: RectShape = {
          id,
          type: "rect",
          x: 120,
          y: 100,
          width: 220,
          height: 140,
          rotation: 0,
          fill: "#111111",
          stroke: "#111111",
          strokeWidth: 0,
          draggable: true,
        };
        dispatch({ type: "ADD_SHAPE", payload: shape });
      },
      addCircle: () => {
        const id = genId("circle");
        const shape: CircleShape = {
          id,
          type: "circle",
          x: 420,
          y: 220,
          width: 160,
          height: 160,
          rotation: 0,
          fill: "#111111",
          stroke: "#111111",
          strokeWidth: 0,
          draggable: true,
        };
        dispatch({ type: "ADD_SHAPE", payload: shape });
      },
      addTriangle: () => {
        const id = genId("triangle");
        const shape: TriangleShape = {
          id,
          type: "triangle",
          x: 300,
          y: 200,
          width: 160,
          height: 160,
          rotation: 0,
          fill: "#111111",
          stroke: "#111111",
          strokeWidth: 0,
          draggable: true,
        };
        dispatch({ type: "ADD_SHAPE", payload: shape });
      },
      addStar: () => {
        const id = genId("star");
        const shape: StarShape = {
          id,
          type: "star",
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          rotation: 0,
          stroke: "#111111",
          strokeWidth: 1,
          fill: "#111111",
          draggable: true,
          numPoints: 5,
        };
        dispatch({ type: "ADD_SHAPE", payload: shape });
      },
      addPolygon: () => {
        const id = genId("polygon");
        const shape: PolygonShape = {
          id,
          type: "polygon",
          x: 250,
          y: 250,
          width: 120,
          height: 120,
          rotation: 0,
          fill: "#111111",
          stroke: "#111111",
          strokeWidth: 0,
          draggable: true,
          sides: 6,
        };
        dispatch({ type: "ADD_SHAPE", payload: shape });
      },
      addText: () => {
        const id = genId("text");
        const shape: TextShape = {
          id,
          type: "text",
          x: 180,
          y: 120,
          width: 300,
          height: 50,
          rotation: 0,
          fill: "#111111",
          draggable: true,
          text: "Inserir texto aqui...",
          fontSize: 24,
          fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
          fontStyle: "normal",
          align: "left",
        };
        dispatch({ type: "ADD_SHAPE", payload: shape });
      },
      addImage: (src: string, opts?: { width: number; height: number }) => {
        const id = genId("image");
        const shape: ImageShape = {
          id,
          type: "image",
          x: 200,
          y: 200,
          width: opts?.width ?? 240,
          height: opts?.height ?? 180,
          rotation: 0,
          draggable: true,
          src,
        };
        dispatch({ type: "ADD_SHAPE", payload: shape });
      },

      // ===== Seleção / edição =====
      select: (id: string | null) => dispatch({ type: "SELECT", id }),
      selectOne: (id: string | null) => dispatch({ type: "SELECT_ONE", id }),
      toggleSelect: (id: string) => dispatch({ type: "TOGGLE_SELECT", id }),
      clearSelection: () => dispatch({ type: "CLEAR_SELECTION" }),
      selectMany: (ids: string[]) => dispatch({ type: "SELECT_MANY", ids }),
      updateShape: (id: string, patch: ShapePatch) =>
        dispatch({ type: "UPDATE_SHAPE", id, patch }),
      startEditText: (id: string) => dispatch({ type: "START_EDIT_TEXT", id }),
      endEditText: () => dispatch({ type: "END_EDIT_TEXT" }),
      deleteSelected: () => dispatch({ type: "DELETE_SELECTED" }),
      setStageSize: (w: number, h: number) =>
        dispatch({ type: "SET_STAGE_SIZE", width: w, height: h }),
    };
  }, [state]);

  return (
    <EditorCtx.Provider value={{ state, dispatch, api }}>
      {children}
    </EditorCtx.Provider>
  );
}

export function useEditor() {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
