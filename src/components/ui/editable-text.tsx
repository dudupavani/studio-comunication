// src/components/ui/editable-text.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import clsx from "clsx";

type EditableTextProps = {
  value: string;
  onSave: (newValue: string) => void | Promise<void>;
  placeholder?: string;
  className?: string; // wrapper (borda/hover)
  inputClassName?: string; // estilo do texto no modo edição
  displayClassName?: string; // estilo do texto no modo exibição
};

export function EditableText({
  value,
  onSave,
  placeholder = "Clique para editar",
  className,
  inputClassName,
  displayClassName,
}: EditableTextProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraftValue(value), [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const next = draftValue.trim();
    if (next && next !== value) await onSave(next);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setDraftValue(value);
    setIsEditing(false);
  };

  // Texto usado para dimensionar (garante largura/altura idênticas)
  const measureText = (isEditing ? draftValue : value) || placeholder || " ";

  return (
    <span
      // wrapper com borda fixa: evita “pulo” de largura entre modos
      className={clsx(
        "inline-grid items-center rounded border transition-colors",
        isEditing
          ? "border-gray-500"
          : "border-transparent hover:border-gray-200 hover:bg-gray-100",
        className
      )}
      // o span invisível define LxA; o conteúdo (div/input) ocupa a mesma célula
      style={{ gridTemplateAreas: '"stack"' }}
      onClick={() => !isEditing && setIsEditing(true)}>
      {/* Sizer invisível (mesmas paddings/typography) */}
      <span
        aria-hidden
        className={clsx(
          "invisible whitespace-pre px-2 py-1 leading-6",
          displayClassName
        )}
        style={{ gridArea: "stack" }}>
        {measureText}
      </span>

      {isEditing ? (
        <input
          ref={inputRef}
          value={draftValue}
          onChange={(e) => setDraftValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          // ocupa exatamente o mesmo espaço do sizer
          style={{ gridArea: "stack" }}
          className={clsx(
            "px-2 py-1 leading-6 bg-transparent outline-none font-inherit",
            "text-inherit", // garante mesma métrica da fonte
            inputClassName
          )}
        />
      ) : (
        <div
          style={{ gridArea: "stack" }}
          className={clsx(
            "px-2 py-1 leading-6 cursor-pointer",
            displayClassName
          )}>
          {value || <span className="text-gray-400">{placeholder}</span>}
        </div>
      )}
    </span>
  );
}
