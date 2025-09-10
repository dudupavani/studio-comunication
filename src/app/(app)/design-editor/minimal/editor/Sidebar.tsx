"use client";

import React from "react";
import { useEditor } from "./store";

export function Sidebar() {
  const {
    api: { addRect, addCircle, addText, deleteSelected },
    state: { selectedId },
  } = useEditor();

  return (
    <aside
      style={{
        background: "#0b1220",
        color: "#e5e7eb",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        borderRight: "1px solid #111827",
      }}>
      <h3 style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>Inserir</h3>
      <button onClick={addRect} style={btnStyle} title="Adicionar Retângulo">
        ▭ Retângulo
      </button>
      <button onClick={addCircle} style={btnStyle} title="Adicionar Círculo">
        ◯ Círculo
      </button>
      <button onClick={addText} style={btnStyle} title="Adicionar Texto">
        ✎ Texto
      </button>

      <div style={{ height: 1, background: "#1f2937", margin: "8px 0" }} />

      <button
        onClick={deleteSelected}
        disabled={!selectedId}
        style={{ ...btnStyle, opacity: selectedId ? 1 : 0.5 }}
        title="Delete (Del)">
        🗑️ Deletar Selecionado
      </button>

      <p style={{ fontSize: 12, opacity: 0.7, marginTop: "auto" }}>
        Dicas: clique fora para desselecionar. Del para apagar. Duplo clique no
        texto para editar.
      </p>
    </aside>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  color: "#e5e7eb",
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
  textAlign: "left",
};
