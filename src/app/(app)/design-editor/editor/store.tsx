"use client";

import React, { createContext, useContext, useMemo, useReducer } from "react";

export type ShapeType = "rect" | "circle" | "text";

export type BaseShape = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  draggable: boolean;
  // Props de texto (para type === "text")
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: string; // "normal" | "bold" | "italic" | ...
  align?: "left" | "center" | "right";
};

export type EditorState = {
  shapes: Record<string, BaseShape>;
  order: string[];
  selectedId: string | null;
  editingId: string | null; // texto em edição
  stage: { width: number; height: number; background: string };
};

type Action =
  | { type: "ADD_SHAPE"; payload: BaseShape }
  | { type: "UPDATE_SHAPE"; id: string; patch: Partial<BaseShape> }
  | { type: "SELECT"; id: string | null }
  | { type: "DELETE_SELECTED" }
  | { type: "SET_STAGE_SIZE"; width: number; height: number }
  | { type: "START_EDIT_TEXT"; id: string }
  | { type: "END_EDIT_TEXT" };

function genId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${(crypto as any).randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const initialState: EditorState = {
  shapes: {},
  order: [],
  selectedId: null,
  editingId: null,
  stage: { width: 1000, height: 700, background: "#ffffff" },
};

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "ADD_SHAPE": {
      const s = action.payload;
      return {
        ...state,
        shapes: { ...state.shapes, [s.id]: s },
        order: [...state.order, s.id],
        selectedId: s.id,
        editingId: s.type === "text" ? s.id : state.editingId,
      };
    }
    case "UPDATE_SHAPE": {
      if (!state.shapes[action.id]) return state;
      return {
        ...state,
        shapes: {
          ...state.shapes,
          [action.id]: { ...state.shapes[action.id], ...action.patch },
        },
      };
    }
    case "SELECT":
      return { ...state, selectedId: action.id, editingId: null };
    case "DELETE_SELECTED": {
      const id = state.selectedId;
      if (!id) return state;
      const { [id]: _, ...rest } = state.shapes;
      return {
        ...state,
        shapes: rest,
        order: state.order.filter((k) => k !== id),
        selectedId: null,
        editingId: state.editingId === id ? null : state.editingId,
      };
    }
    case "SET_STAGE_SIZE":
      return {
        ...state,
        stage: { ...state.stage, width: action.width, height: action.height },
      };
    case "START_EDIT_TEXT":
      return { ...state, editingId: action.id, selectedId: action.id };
    case "END_EDIT_TEXT":
      return { ...state, editingId: null };
    default:
      return state;
  }
}

const EditorCtx = createContext<{
  state: EditorState;
  dispatch: React.Dispatch<Action>;
  api: {
    addRect: () => void;
    addCircle: () => void;
    addText: () => void;
    select: (id: string | null) => void;
    updateShape: (id: string, patch: Partial<BaseShape>) => void;
    startEditText: (id: string) => void;
    endEditText: () => void;
    deleteSelected: () => void;
    setStageSize: (w: number, h: number) => void;
  };
} | null>(null);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const api = useMemo(() => {
    return {
      addRect: () => {
        const id = genId("rect");
        dispatch({
          type: "ADD_SHAPE",
          payload: {
            id,
            type: "rect",
            x: 120,
            y: 100,
            width: 220,
            height: 140,
            rotation: 0,
            fill: "#f87171",
            stroke: "#1f2937",
            strokeWidth: 0,
            draggable: true,
          },
        });
      },
      addCircle: () => {
        const id = genId("circle");
        dispatch({
          type: "ADD_SHAPE",
          payload: {
            id,
            type: "circle",
            x: 420,
            y: 220,
            width: 160,
            height: 160,
            rotation: 0,
            fill: "#60a5fa",
            stroke: "#1f2937",
            strokeWidth: 0,
            draggable: true,
          },
        });
      },
      addText: () => {
        const id = genId("text");
        dispatch({
          type: "ADD_SHAPE",
          payload: {
            id,
            type: "text",
            x: 180,
            y: 120,
            width: 300,
            height: 50,
            rotation: 0,
            fill: "#111827",
            draggable: true,
            // FIX: inicia sem placeholder salvo
            text: "Inserir texto aqui...",
            fontSize: 24,
            fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto",
            fontStyle: "normal",
            align: "left",
          },
        });
      },
      select: (id: string | null) => dispatch({ type: "SELECT", id }),
      updateShape: (id: string, patch: Partial<BaseShape>) =>
        dispatch({ type: "UPDATE_SHAPE", id, patch }),
      startEditText: (id: string) => dispatch({ type: "START_EDIT_TEXT", id }),
      endEditText: () => dispatch({ type: "END_EDIT_TEXT" }),
      deleteSelected: () => dispatch({ type: "DELETE_SELECTED" }),
      setStageSize: (w: number, h: number) =>
        dispatch({ type: "SET_STAGE_SIZE", width: w, height: h }),
    };
  }, []);

  const value = useMemo(() => ({ state, dispatch, api }), [state, api]);

  return <EditorCtx.Provider value={value}>{children}</EditorCtx.Provider>;
}

export function useEditor() {
  const ctx = useContext(EditorCtx);
  if (!ctx) throw new Error("useEditor must be used inside EditorProvider");
  return ctx;
}
