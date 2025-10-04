"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  disabled?: boolean;
  onSend: (message: string) => Promise<void> | void;
}

export function ChatInput({ disabled, onSend }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
    await onSend(trimmed);
    setValue("");
  }, [disabled, onSend, value]);

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
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          variant={"outline"}
          size="icon-md">
          <Paperclip size={22} />
        </Button>
        <Button
          onClick={submit}
          disabled={disabled || value.trim().length === 0}
          size="icon">
          <Send size={22} />
        </Button>
      </div>
    </div>
  );
}
