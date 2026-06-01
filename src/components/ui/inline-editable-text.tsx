"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type InlineEditableTextProps = {
  value: string;
  onSave: (value: string) => void | Promise<void>;
  size?: "sm" | "md" | "lg";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
  "aria-label"?: string;
};

function InlineEditableText({
  value,
  onSave,
  size = "md",
  placeholder = "Clique para editar",
  disabled = false,
  className,
  inputClassName,
  "aria-label": ariaLabel,
}: InlineEditableTextProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const [saving, setSaving] = React.useState(false);
  const sizeClassName = {
    sm: "min-h-8 px-2 py-1 text-sm font-medium",
    md: "min-h-9 px-2 py-1 text-base font-semibold",
    lg: "min-h-10 px-2 py-1 text-lg font-semibold",
  }[size];

  React.useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  React.useEffect(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);

  function startEditing() {
    if (disabled || saving) return;
    setDraft(value);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(value);
    setEditing(false);
  }

  async function commitEditing() {
    const nextValue = draft.trim();
    if (!nextValue) {
      cancelEditing();
      return;
    }

    if (nextValue === value) {
      setEditing(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(nextValue);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Input
        ref={inputRef}
        value={draft}
        disabled={saving}
        aria-label={ariaLabel ?? placeholder}
        className={cn("h-auto", sizeClassName, inputClassName)}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commitEditing}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void commitEditing();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            cancelEditing();
          }
        }}
      />
    );
  }

  return (
    <button
      type="button"
      disabled={disabled || saving}
      aria-label={ariaLabel ?? placeholder}
      className={cn(
        "w-full rounded-md text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-70",
        sizeClassName,
        className
      )}
      onClick={startEditing}>
      {value.trim() || (
        <span className="text-muted-foreground">{placeholder}</span>
      )}
    </button>
  );
}

export { InlineEditableText };
