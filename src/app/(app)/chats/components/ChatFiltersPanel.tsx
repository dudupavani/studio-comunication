"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import type { DateRange } from "react-day-picker";
import {
  CalendarRange,
  ChevronDown,
  ListFilter,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import UserSummary from "@/components/shared/user-summary";
import type { ChatFilters } from "@/lib/messages/types";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

export type { ChatFilters } from "@/lib/messages/types";

type CreatorOption = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  title: string | null;
};

const EMPTY_FILTERS: ChatFilters = {
  creatorIds: [],
  createdFrom: null,
  createdTo: null,
};

const DATE_VALUE_FORMAT = "yyyy-MM-dd";
const DATE_DISPLAY_FORMAT = "dd/MM/yyyy";

function normalizeFilters(filters?: Partial<ChatFilters> | null): ChatFilters {
  return {
    creatorIds: Array.isArray(filters?.creatorIds)
      ? filters?.creatorIds.filter(Boolean) ?? []
      : [],
    createdFrom: filters?.createdFrom ?? null,
    createdTo: filters?.createdTo ?? null,
  };
}

function safeParseDate(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  } catch {
    return null;
  }
}

function formatDateDisplay(value?: string | null) {
  const parsed = safeParseDate(value);
  return parsed ? format(parsed, DATE_DISPLAY_FORMAT) : null;
}

interface CreatorMultiSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

function CreatorMultiSelect({ value, onChange }: CreatorMultiSelectProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CreatorOption[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<
    Record<string, CreatorOption>
  >({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const optionMap = useMemo(() => {
    const map = new Map<string, CreatorOption>();
    options.forEach((opt) => map.set(opt.id, opt));
    Object.values(selectedDetails).forEach((opt) => map.set(opt.id, opt));
    return map;
  }, [options, selectedDetails]);

  const selectedCreators = useMemo(
    () =>
      value
        .map((id) => optionMap.get(id))
        .filter((item): item is CreatorOption => Boolean(item)),
    [optionMap, value]
  );

  const allSelectedCreators = useMemo(() => {
    const missing = value
      .filter((id) => !optionMap.get(id))
      .map((id) => ({
        id,
        name: id,
        avatarUrl: null,
        title: null,
      }));
    return [...selectedCreators, ...missing];
  }, [optionMap, selectedCreators, value]);

  const toggleCreator = useCallback(
    (id: string) => {
      if (value.includes(id)) {
        onChange(value.filter((item) => item !== id));
      } else {
        onChange([...value, id]);
      }
    },
    [onChange, value]
  );

  const mapApiToOption = useCallback(
    (user: {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      cargo?: string | null;
    }): CreatorOption => ({
      id: user.id,
      name: user.full_name || user.id,
      avatarUrl: user.avatar_url ?? null,
      title: user.cargo ?? null,
    }),
    []
  );

  const loadCreators = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chats/creators");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as any;
        throw new Error(body?.error?.message || `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as {
        items: Array<{
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          cargo?: string | null;
        }>;
      };

      const mapped = payload.items.map(mapApiToOption);
      setOptions(mapped);
      setSelectedDetails((prev) => {
        const next = { ...prev };
        mapped.forEach((item) => {
          if (value.includes(item.id)) {
            next[item.id] = item;
          }
        });
        return next;
      });
    } catch (err: any) {
      console.error("Chat filters load creators error", err);
      toast({
        title: "Erro ao carregar criadores",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [mapApiToOption, toast, value]);

  useEffect(() => {
    if (!open) return;
    if (loading) return;
    if (options.length) return;
    loadCreators();
  }, [loadCreators, loading, open, options.length]);

  const triggerLabel = useMemo(() => {
    if (!allSelectedCreators.length) return "Todos os criadores";
    if (allSelectedCreators.length === 1) {
      return allSelectedCreators[0].name || allSelectedCreators[0].id;
    }
    const first = allSelectedCreators[0];
    return `${first.name || first.id} +${allSelectedCreators.length - 1}`;
  }, [allSelectedCreators]);

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => {
      const name = option.name?.toLowerCase() ?? "";
      const title = option.title?.toLowerCase() ?? "";
      return (
        name.includes(needle) ||
        option.id.toLowerCase().includes(needle) ||
        title.includes(needle)
      );
    });
  }, [options, query]);

  const activateOption = useCallback(
    (event: React.KeyboardEvent | React.MouseEvent, id: string) => {
      if ("key" in event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
      }
      toggleCreator(id);
    },
    [toggleCreator]
  );

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="text-left text-sm">{triggerLabel}</span>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className=" p-0"
          align="start"
          style={{ width: "var(--radix-popover-trigger-width)" }}>
          <div className="border-b px-3 py-3">
            <Input
              placeholder="Buscar criador"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
          </div>
          <ScrollArea className="max-h-80">
            <div className="space-y-1 p-2">
              {filteredOptions.map((option) => {
                const checked = value.includes(option.id);
                return (
                  <div
                    key={option.id}
                    role="button"
                    tabIndex={0}
                    onClick={(event) => activateOption(event, option.id)}
                    onKeyDown={(event) => activateOption(event, option.id)}
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted focus:outline-none focus:bg-gray-200">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleCreator(option.id)}
                    />
                    <UserSummary
                      avatarUrl={option.avatarUrl}
                      name={option.name}
                      subtitle={option.title ?? undefined}
                      fallback={option.id}
                    />
                  </div>
                );
              })}

              {!filteredOptions.length && !loading ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum criador encontrado.
                </p>
              ) : null}

              {loading ? (
                <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando...
                </div>
              ) : null}
            </div>
          </ScrollArea>
          <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
            <div className="text-xs text-muted-foreground">
              {value.length
                ? `${value.length} selecionado(s)`
                : "Nenhum selecionado"}
            </div>
            <Button variant="ghost" size="xs" onClick={() => setQuery("")}>
              Limpar busca
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {allSelectedCreators.length ? (
        <div className="flex flex-wrap gap-2 pt-2">
          {allSelectedCreators.map((creator) => (
            <Badge key={creator.id} variant="secondary">
              <span className="max-w-[180px] truncate">
                {creator.name || creator.id}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => toggleCreator(creator.id)}>
                <X />
              </Button>
            </Badge>
          ))}
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>
            Limpar
          </Button>
        </div>
      ) : null}
    </div>
  );
}

interface DateRangeSelectorProps {
  value: { from: string | null; to: string | null };
  onChange: (next: { from: string | null; to: string | null }) => void;
}

function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [open, setOpen] = useState(false);

  const selectedRange = useMemo<DateRange | undefined>(() => {
    const from = safeParseDate(value.from);
    const to = safeParseDate(value.to);
    if (!from && !to) return undefined;
    return {
      from: from ?? to ?? undefined,
      to: to ?? from ?? undefined,
    };
  }, [value.from, value.to]);

  const label = useMemo(() => {
    const fromLabel = formatDateDisplay(value.from);
    const toLabel = formatDateDisplay(value.to);
    if (fromLabel && toLabel) return `${fromLabel} – ${toLabel}`;
    if (fromLabel) return `A partir de ${fromLabel}`;
    if (toLabel) return `Até ${toLabel}`;
    return "Selecione o período";
  }, [value.from, value.to]);

  const handleSelect = useCallback(
    (range?: DateRange) => {
      const nextFrom = range?.from
        ? format(range.from, DATE_VALUE_FORMAT)
        : null;
      const nextTo = range?.to ? format(range.to, DATE_VALUE_FORMAT) : null;
      onChange({ from: nextFrom, to: nextTo });
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          <span className="text-left text-sm">{label}</span>
          <CalendarRange className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          numberOfMonths={2}
          selected={selectedRange}
          onSelect={handleSelect}
          initialFocus
        />
        <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
          <div className="text-xs text-muted-foreground">
            Selecione a data inicial e final.
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => onChange({ from: null, to: null })}>
            Limpar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface ChatFiltersPanelProps {
  value: ChatFilters;
  onApply: (filters: ChatFilters) => void;
}

export function ChatFiltersPanel({ value, onApply }: ChatFiltersPanelProps) {
  const [open, setOpen] = useState(false);
  const normalizedValue = useMemo(() => normalizeFilters(value), [value]);
  const [draft, setDraft] = useState<ChatFilters>(normalizedValue);

  useEffect(() => {
    if (!open) {
      setDraft(normalizeFilters(normalizedValue));
    }
  }, [normalizedValue, open]);

  const hasFilters =
    draft.creatorIds.length > 0 ||
    Boolean(draft.createdFrom) ||
    Boolean(draft.createdTo);

  const handleApply = () => {
    if (!hasFilters) return;
    const uniqueCreators = Array.from(new Set(draft.creatorIds));
    const next = normalizeFilters({
      ...draft,
      creatorIds: uniqueCreators,
    });
    setDraft(next);
    onApply(next);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          <ListFilter />
          Filtros
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Filtrar conversas</SheetTitle>
          </div>
        </SheetHeader>
        <div className="flex h-full flex-col flex-1">
          <div className="flex-1 space-y-6 overflow-y-auto">
            <div className="space-y-6">
              <div className="space-y-1">
                <Label>Criado em</Label>
                <DateRangeSelector
                  value={{
                    from: draft.createdFrom,
                    to: draft.createdTo,
                  }}
                  onChange={({ from, to }) =>
                    setDraft((prev) => ({
                      ...prev,
                      createdFrom: from,
                      createdTo: to,
                    }))
                  }
                />
              </div>

              <div className="space-y-1 z-50">
                <Label>Criado por</Label>
                <CreatorMultiSelect
                  value={draft.creatorIds}
                  onChange={(creatorIds) =>
                    setDraft((prev) => ({ ...prev, creatorIds }))
                  }
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 py-4">
            <Button
              variant="ghost"
              onClick={() => {
                const reset = normalizeFilters(EMPTY_FILTERS);
                setDraft(reset);
                onApply(reset);
                setOpen(false);
              }}
              className="flex-1"
              disabled={!hasFilters}>
              Limpar filtros
            </Button>
            <Button
              onClick={handleApply}
              className="flex-1"
              disabled={!hasFilters}>
              Aplicar filtros
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
