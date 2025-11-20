"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  disabled?: boolean;
  onSend: (payload: { message: string; files: File[] }) => Promise<void> | void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const submit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    await onSend({ message: trimmed, files });
    setValue("");
    setFiles([]);
  }, [disabled, files, onSend, value]);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.target.files ?? []);
      if (!selected.length) return;
      setFiles((prev) => [...prev, ...selected].slice(0, 5));
      event.target.value = "";
    },
    []
  );

  const removeFile = useCallback((name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }, []);

  return (
    <div className="border-t border-border">
      <div className="flex items-end gap-3 px-6 pt-6 pb-4">
        <Textarea
          ref={textareaRef}
          className="min-h-[120px] flex-1 resize-none border-none bg-transparent px-0 py-0 text-base focus-visible:ring-0"
          placeholder="Digite uma mensagem"
          value={value}
          disabled={disabled}
          rows={1}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          variant="outline"
          size="icon-md">
          <Paperclip size={22} />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          size="icon">
          <Send size={22} />
        </Button>
      </div>

      {files.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-6 pb-3 text-xs text-muted-foreground">
          {files.map((file) => (
            <div
              key={`${file.name}-${file.size}`}
              className="flex items-center gap-2 rounded-full bg-secondary border px-5 py-1 shadow-md">
              <span className="text-foreground font-medium">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(file.name)}
                className="text-lg text-muted-foreground hover:text-foreground"
                aria-label={`Remover ${file.name}`}>
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
