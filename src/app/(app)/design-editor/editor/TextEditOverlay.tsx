"use client";

import React, { useEffect, useRef } from "react";
import Konva from "konva";
import { useEditor } from "./store";

type Props = {
  container: HTMLDivElement | null;
  stageRef: React.RefObject<Konva.Stage>;
};

export default function TextEditOverlay({ container, stageRef }: Props) {
  const {
    state: { editingId, shapes },
    api: { updateShape, endEditText, select },
  } = useEditor();

  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!editingId || !container || !stageRef.current) return;

    const stage = stageRef.current;
    const node = stage.findOne(`#${editingId}`) as Konva.Text | null;
    if (!node) return;

    // cria textarea
    const ta = document.createElement("textarea");
    taRef.current = ta;
    const s = shapes[editingId];
    ta.value = s.text ?? "";

    // estilo básico
    Object.assign(ta.style, {
      position: "absolute",
      left: "0px",
      top: "0px",
      padding: "4px 6px",
      margin: "0",
      border: "1px solid #93c5fd",
      outline: "none",
      resize: "none",
      background: "#ffffff",
      color: s.fill || "#111827",
      fontSize: `${s.fontSize || 24}px`,
      fontFamily:
        s.fontFamily || "Inter, system-ui, -apple-system, Segoe UI, Roboto",
      fontWeight: s.fontStyle?.includes("bold") ? "700" : "400",
      fontStyle: s.fontStyle?.includes("italic") ? "italic" : "normal",
      lineHeight: "1.2",
      whiteSpace: "pre-wrap",
      overflow: "hidden",
      zIndex: "10",
      transformOrigin: "left top",
    } as CSSStyleDeclaration);

    // posiciona
    const abs = node.getAbsolutePosition();
    const scale = stage.scaleX(); // assume escala uniforme
    const stageRect = (
      stage.container() as HTMLDivElement
    ).getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    const left = contRect.left - stageRect.left + abs.x * scale;
    const top = contRect.top - stageRect.top + abs.y * scale;

    ta.style.left = `${left}px`;
    ta.style.top = `${top}px`;
    ta.style.width = `${(s.width || 300) * scale}px`;
    ta.style.height = `${
      Math.max(s.height || 50, (s.fontSize || 24) * 1.5) * scale
    }px`;
    ta.style.transform = `rotate(${s.rotation || 0}deg)`;

    container.appendChild(ta);
    ta.focus();
    ta.select();

    const commit = () => {
      const newText = ta.value;
      updateShape(editingId, { text: newText });
      endEditText();
      ta.remove();
      select(editingId); // mantém selecionado
    };

    const cancel = () => {
      endEditText();
      ta.remove();
    };

    ta.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        commit();
      } else if (e.key === "Escape") {
        cancel();
      }
    });

    ta.addEventListener("blur", commit);

    return () => {
      ta.removeEventListener("blur", commit);
      taRef.current?.remove();
      taRef.current = null;
    };
  }, [
    editingId,
    container,
    stageRef,
    shapes,
    updateShape,
    endEditText,
    select,
  ]);

  return null;
}
