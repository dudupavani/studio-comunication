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
    const node = stage.findOne<Konva.Text>("#" + editingId);
    if (!node) return;

    // cria textarea
    const ta = document.createElement("textarea");
    taRef.current = ta;

    // valor inicial
    const s = shapes[editingId];
    ta.value = s && "text" in s ? (s as any).text ?? "" : "";

    // escala do stage (considera X/Y separadamente)
    const scaleX = stage.scaleX() || 1;
    const scaleY = stage.scaleY() || 1;

    // Medidas REAIS do nó de texto (não derive do estado)
    // - posição absoluta do nó (âncora top-left)
    const abs = node.getAbsolutePosition();

    // - largura/altura reais
    const width = node.width() * scaleX;
    const height = node.height() * scaleY;

    // Posicionamento relativo ao container do overlay (é o mesmo wrapper do Stage)
    const left = abs.x * scaleX;
    const top = abs.y * scaleY;

    // tipografia do nó
    const fontFamily =
      node.fontFamily() || "Inter, system-ui, -apple-system, Segoe UI, Roboto";
    const fontSize = node.fontSize() || 24;
    const fontStyle = node.fontStyle() || "normal";
    const lineHeight = node.lineHeight() || 1.2;
    const align = (node.align?.() as CanvasTextAlign) || "left";
    const padding = (node as any).padding?.() ?? 0; // Konva.Text tem padding()

    // estilo fiel ao Konva.Text
    Object.assign(ta.style, {
      position: "absolute",
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      padding: `${padding * scaleY}px ${padding * scaleX}px`,
      margin: "0",
      border: "1px solid #93c5fd",
      outline: "none",
      resize: "none",
      background: "#ffffff",
      color: node.fill() as string,
      fontFamily,
      fontSize: `${fontSize * scaleY}px`, // acompanha escala visual
      fontStyle,
      // se fontStyle inclui "bold" ou "italic" o Konva já combina,
      // o browser respeita via fontStyle/fontWeight — manter simples:
      fontWeight: fontStyle.includes("bold") ? "700" : "400",
      lineHeight: String(lineHeight), // numérico como no Konva
      textAlign: align,
      whiteSpace: "pre-wrap",
      overflow: "hidden",
      zIndex: "10",
      transformOrigin: "left top",
      transform: `rotate(${node.rotation()}deg)`,
      boxSizing: "border-box", // largura/altura incluem padding (compatível com Konva)
      // opcional:
      // boxShadow: "0 0 0 1px rgba(147,197,253,0.6)",
    } as CSSStyleDeclaration);

    // anexa e foca
    container.appendChild(ta);
    ta.focus();
    ta.select();

    // (opcional) auto-ajuste de altura enquanto digita para evitar corte
    const autoGrow = () => {
      ta.style.height = "auto";
      // mínimo = altura atual do nó; se conteúdo maior, expande
      const minH = height;
      const nextH = Math.max(minH, ta.scrollHeight);
      ta.style.height = `${nextH}px`;
    };
    ta.addEventListener("input", autoGrow);

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
      if (
        (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ||
        (e.key === "Escape" && !e.shiftKey)
      ) {
        e.preventDefault();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
      if (e.key === "Escape") cancel();
    });

    ta.addEventListener("blur", commit);

    return () => {
      ta.removeEventListener("input", autoGrow);
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
