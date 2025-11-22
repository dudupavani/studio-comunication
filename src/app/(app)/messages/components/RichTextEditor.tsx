"use client";

import { useEffect, useRef, type ComponentType } from "react";
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const COMMANDS: Array<{
  icon: ComponentType<{ className?: string }>;
  label: string;
  command: string;
  value?: string;
}> = [
  { icon: Bold, label: "Negrito", command: "bold" },
  { icon: Italic, label: "Itálico", command: "italic" },
  { icon: Underline, label: "Sublinhado", command: "underline" },
  { icon: AlignLeft, label: "Alinhar à esquerda", command: "justifyLeft" },
  { icon: AlignCenter, label: "Centralizar", command: "justifyCenter" },
  { icon: AlignRight, label: "Alinhar à direita", command: "justifyRight" },
];

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (value && value !== el.innerHTML) {
      el.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string) => {
    if (typeof document === "undefined") return;
    editorRef.current?.focus();
    document.execCommand(command, false);
    const el = editorRef.current;
    if (el) {
      onChange(el.innerHTML);
    }
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex flex-wrap gap-1 rounded-t-lg border border-border bg-muted/60 p-1">
        {COMMANDS.map(({ icon: Icon, label, command }) => (
          <Button
            key={command}
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => exec(command)}
            title={label}>
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>
      <div className="relative">
        <div
          ref={editorRef}
          className="min-h-[160px] w-full rounded-b-lg border border-border bg-background px-3 py-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          tabIndex={0}
          contentEditable
          suppressContentEditableWarning
          onInput={(event) => {
            const html = (event.currentTarget as HTMLDivElement).innerHTML;
            onChange(html);
          }}
          onBlur={(event) => onChange(event.currentTarget.innerHTML)}
        />

        {!value && placeholder ? (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">
            {placeholder}
          </span>
        ) : null}
      </div>
    </div>
  );
}
