"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  AtSign,
  Loader2,
  Sparkles,
  Bold,
  Italic,
  List,
  Smile,
} from "lucide-react";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SendMessageMentionInput } from "@/lib/messages/validations";
import type { ChatMemberWithUser } from "./types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ChatInputProps {
  disabled?: boolean;
  members: ChatMemberWithUser[];
  onSend: (payload: {
    message: string;
    files: File[];
    mentions: SendMessageMentionInput[];
  }) => Promise<void> | void;
}

type MentionOption =
  | { type: "all"; label: string }
  | {
      type: "user";
      userId: string;
      label: string;
      email: string | null;
      avatar_url: string | null;
    };

function resolveMemberOption(member: ChatMemberWithUser): MentionOption {
  const label =
    member.user?.full_name?.trim() ||
    member.user?.email?.trim() ||
    member.user_id;
  return {
    type: "user",
    userId: member.user_id,
    label,
    email: member.user?.email ?? null,
    avatar_url: member.user?.avatar_url ?? null,
  };
}

function filterMentionsInText(
  text: string,
  mentions: SendMessageMentionInput[]
): SendMessageMentionInput[] {
  const lower = text.toLowerCase();
  return mentions.filter((mention) => {
    const label =
      mention.type === "all" ? "todos" : mention.label?.toLowerCase().trim();
    if (!label) return false;
    return lower.includes(`@${label}`);
  });
}

function findMentionTrigger(text: string, cursor: number) {
  const search = text.slice(0, cursor);
  const atIndex = search.lastIndexOf("@");
  if (atIndex === -1) return null;
  if (atIndex > 0) {
    const prev = search[atIndex - 1];
    if (prev && /[^\s([{]/.test(prev)) {
      return null;
    }
  }
  const query = search.slice(atIndex + 1);
  if (query.includes(" ") || query.includes("\n") || query.includes("\t")) {
    return null;
  }
  return { start: atIndex, query };
}

export function ChatInput({ disabled, onSend, members }: ChatInputProps) {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mentions, setMentions] = useState<SendMessageMentionInput[]>([]);
  const [mentionTrigger, setMentionTrigger] = useState<{
    start: number;
    query: string;
  } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeMentionIndex, setActiveMentionIndex] = useState(0);
  const [correcting, setCorrecting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const mentionOptions = useMemo(() => {
    if (!mentionTrigger) return [];
    const base: MentionOption[] = [
      { type: "all", label: "Todos" },
      ...members.map(resolveMemberOption),
    ];
    const query = mentionTrigger.query.toLowerCase();
    const filtered = base.filter((opt) => {
      if (!query) return true;
      if (opt.type === "all") return "todos".includes(query);
      return (
        opt.label.toLowerCase().includes(query) ||
        (opt.email ?? "").toLowerCase().includes(query)
      );
    });
    return filtered.slice(0, 20);
  }, [members, mentionTrigger]);

  useEffect(() => {
    setActiveMentionIndex((prev) =>
      mentionOptions.length === 0
        ? 0
        : Math.min(prev, mentionOptions.length - 1)
    );
  }, [mentionOptions.length]);

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  const updateValueAndSelection = useCallback(
    (nextValue: string, selectionStart: number, selectionEnd?: number) => {
      setValue(nextValue);
      setMentions((prev) => filterMentionsInText(nextValue, prev));

      const cursor = selectionEnd ?? selectionStart;
      const trigger = findMentionTrigger(nextValue, cursor);
      setMentionTrigger(trigger);
      if (trigger) setActiveMentionIndex(0);

      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (!el) return;

        const clampedStart = Math.max(
          0,
          Math.min(selectionStart, nextValue.length)
        );
        const clampedEnd = Math.max(
          0,
          Math.min(selectionEnd ?? selectionStart, nextValue.length)
        );

        el.focus();
        el.setSelectionRange(clampedStart, clampedEnd);
        autoResize();
      });
    },
    [autoResize]
  );

  const updateTriggerFromCursor = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const cursor = el.selectionStart ?? el.value.length;
    const nextTrigger = findMentionTrigger(el.value, cursor);
    setMentionTrigger(nextTrigger);
    if (nextTrigger) {
      setActiveMentionIndex(0);
    }
  }, []);

  const insertAtCursor = useCallback(
    (snippet: string) => {
      if (disabled) return;
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? start;

      const nextValue = `${value.slice(0, start)}${snippet}${value.slice(end)}`;
      const nextCursor = start + snippet.length;

      updateValueAndSelection(nextValue, nextCursor);
    },
    [disabled, updateValueAndSelection, value]
  );

  const wrapSelection = useCallback(
    (before: string, after: string) => {
      if (disabled) return;
      const el = textareaRef.current;
      if (!el) return;
      const start = el.selectionStart ?? 0;
      const end = el.selectionEnd ?? start;
      const hasSelection = start !== end;
      const selected = value.slice(start, end);
      const wrapped = hasSelection
        ? `${before}${selected}${after}`
        : `${before}${after}`;

      const nextValue = `${value.slice(0, start)}${wrapped}${value.slice(end)}`;

      if (hasSelection) {
        const nextStart = start + before.length;
        const nextEnd = nextStart + selected.length;
        updateValueAndSelection(nextValue, nextStart, nextEnd);
        return;
      }

      const caretPosition = start + before.length;
      updateValueAndSelection(nextValue, caretPosition);
    },
    [disabled, updateValueAndSelection, value]
  );

  const insertListPrefix = useCallback(() => {
    if (disabled) return;
    const el = textareaRef.current;
    if (!el) return;
    const text = value;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? start;

    const rangeStart = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextLineBreak = text.indexOf("\n", end);
    const rangeEnd = nextLineBreak === -1 ? text.length : nextLineBreak;

    const segment = text.slice(rangeStart, rangeEnd);
    const lines = segment.split("\n");
    const prefixed = lines.map((line) =>
      line.startsWith("- ") ? line : `- ${line}`
    );
    const nextSegment = prefixed.join("\n");
    const nextValue = `${text.slice(0, rangeStart)}${nextSegment}${text.slice(
      rangeEnd
    )}`;

    const addedPerLine = prefixed.map(
      (line, idx) => line.length - lines[idx].length
    );
    const linesBeforeStart =
      text.slice(rangeStart, start).split("\n").length - 1;
    const linesBeforeEnd = text.slice(rangeStart, end).split("\n").length - 1;

    const addedBeforeStart = addedPerLine
      .slice(0, linesBeforeStart + 1)
      .reduce((acc, curr) => acc + curr, 0);
    const addedBeforeEnd = addedPerLine
      .slice(0, linesBeforeEnd + 1)
      .reduce((acc, curr) => acc + curr, 0);

    const nextStart = start + addedBeforeStart;
    const nextEnd = end + addedBeforeEnd;

    updateValueAndSelection(nextValue, nextStart, nextEnd);
  }, [disabled, updateValueAndSelection, value]);

  const insertMention = useCallback(
    (option: MentionOption) => {
      const el = textareaRef.current;
      if (!el) return;
      const cursor = el.selectionStart ?? value.length;
      const trigger = mentionTrigger ?? findMentionTrigger(value, cursor);
      if (!trigger) return;

      const displayLabel = option.label;
      const mentionText = `@${displayLabel}`;
      const before = value.slice(0, trigger.start);
      const after = value.slice(cursor);
      const nextValue = `${before}${mentionText} ${after}`;

      const nextMentions =
        option.type === "all"
          ? [
              { type: "all", label: option.label } as SendMessageMentionInput,
              ...mentions.filter((m) => m.type !== "all"),
            ]
          : mentions.some(
              (m) => m.type === "user" && m.userId === option.userId
            )
          ? mentions
          : [
              ...mentions,
              {
                type: "user",
                userId: option.userId,
                label: option.label,
              } as SendMessageMentionInput,
            ];

      setValue(nextValue);
      setMentions(filterMentionsInText(nextValue, nextMentions));
      setMentionTrigger(null);
      setActiveMentionIndex(0);
      setShowEmojiPicker(false);

      requestAnimationFrame(() => {
        const targetPos = before.length + mentionText.length + 1;
        el.focus();
        el.setSelectionRange(targetPos, targetPos);
        autoResize();
      });
    },
    [autoResize, mentionTrigger, mentions, value]
  );

  const submit = useCallback(async () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    const mentionsToSend = filterMentionsInText(value, mentions);
    await onSend({ message: trimmed, files, mentions: mentionsToSend });
    setValue("");
    setFiles([]);
    setMentions([]);
    setMentionTrigger(null);
    setActiveMentionIndex(0);
    setShowEmojiPicker(false);
  }, [disabled, files, mentions, onSend, value]);

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

  const handleTextareaChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const nextValue = e.target.value;
      setValue(nextValue);
      setMentions((prev) => filterMentionsInText(nextValue, prev));
      const cursor = e.target.selectionStart ?? nextValue.length;
      const trigger = findMentionTrigger(nextValue, cursor);
      setMentionTrigger(trigger);
      if (trigger) setActiveMentionIndex(0);
    },
    []
  );

  const handleCorrect = useCallback(async () => {
    if (disabled || correcting) return;
    const currentText = value;
    if (!currentText.trim()) return;

    setCorrecting(true);
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch("/api/chat/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: currentText }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error("REQUEST_FAILED");
      }

      const payload = (await response.json().catch(() => null)) as {
        corrected?: string;
      };
      const corrected = payload?.corrected;

      if (!corrected || typeof corrected !== "string") {
        throw new Error("INVALID_RESPONSE");
      }

      setValue(corrected);
      setMentions((prev) => filterMentionsInText(corrected, prev));
      setMentionTrigger(null);

      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          const end = corrected.length;
          el.focus();
          el.setSelectionRange(end, end);
        }
      });
    } catch (err) {
      toast({
        title: "Erro ao corrigir texto",
        variant: "destructive",
      });
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      setCorrecting(false);
    }
  }, [correcting, disabled, toast, value]);

  return (
    <div className="border-t border-border">
      <div className="flex flex-col gap-1 px-3 pt-2 pb-6">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            className="flex-1 resize-none border-none bg-transparent px-0 py-0 text-base focus-visible:ring-0"
            placeholder="Digite uma mensagem"
            value={value}
            disabled={disabled}
            minHeight={60}
            maxHeight={240}
            onChange={handleTextareaChange}
            onClick={updateTriggerFromCursor}
            onKeyUp={updateTriggerFromCursor}
            onKeyDown={(e) => {
              if (mentionTrigger && mentionOptions.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveMentionIndex((prev) =>
                    prev + 1 >= mentionOptions.length ? 0 : prev + 1
                  );
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveMentionIndex((prev) =>
                    prev - 1 < 0 ? mentionOptions.length - 1 : prev - 1
                  );
                  return;
                }
                if (e.key === "Tab" || (e.key === "Enter" && !e.shiftKey)) {
                  e.preventDefault();
                  const option =
                    mentionOptions[activeMentionIndex] ?? mentionOptions[0];
                  if (option) insertMention(option);
                  return;
                }
                if (e.key === "Escape") {
                  setMentionTrigger(null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
          />
          {mentionTrigger && mentionOptions.length > 0 ? (
            <div className="absolute left-0 bottom-full mb-2 w-72 overflow-hidden rounded-xl border bg-white shadow-xl z-30">
              <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                <AtSign className="h-4 w-4" />
                Menções
              </div>
              <div className="max-h-64 overflow-y-auto">
                {mentionOptions.map((option, idx) => {
                  const isActive = idx === activeMentionIndex;
                  const key = option.type === "all" ? "all" : option.userId;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-muted",
                        isActive ? "bg-muted" : "bg-white"
                      )}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => insertMention(option)}>
                      {option.type === "user" ? (
                        <Avatar className="h-7 w-7">
                          <AvatarImage
                            src={option.avatar_url ?? undefined}
                            alt={option.label}
                          />
                          <AvatarFallback>
                            {option.label.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          @
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">
                          {option.type === "all"
                            ? "@Todos"
                            : `@${option.label}`}
                        </span>
                        {option.type === "user" && option.email ? (
                          <span className="text-xs text-muted-foreground">
                            {option.email}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={disabled}
              onClick={() => wrapSelection("**", "**")}
              aria-label="Negrito">
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={disabled}
              onClick={() => wrapSelection("*", "*")}
              aria-label="Itálico">
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              disabled={disabled}
              onClick={insertListPrefix}
              aria-label="Lista">
              <List className="h-4 w-4" />
            </Button>
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  disabled={disabled}
                  aria-label="Inserir emoji">
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="start"
                className="w-[320px] p-0 shadow-xl">
                <Picker
                  data={data}
                  set="native"
                  previewPosition="none"
                  navPosition="bottom"
                  onEmojiSelect={(emoji: { native?: string }) => {
                    if (!emoji?.native) return;
                    insertAtCursor(emoji.native);
                    setShowEmojiPicker(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center gap-3">
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleCorrect}
                    disabled={
                      disabled || correcting || value.trim().length === 0
                    }
                    size="icon"
                    variant="outline">
                    {correcting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Corrigir ortografia com IA
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
              disabled={disabled || value.trim().length === 0}>
              <Send size={22} />
              <span>Enviar</span>
            </Button>
          </div>
        </div>
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
