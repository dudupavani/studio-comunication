"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export interface UserGroupOption {
  id: string;
  name: string;
  membersCount: number;
  color?: string | null;
}

interface GroupMultiSelectProps {
  value: UserGroupOption[];
  onChange: (groups: UserGroupOption[]) => void;
}

export function GroupMultiSelect({ value, onChange }: GroupMultiSelectProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<UserGroupOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const load = useCallback(
    async ({ append, cursor: cursorArg, query: queryArg }: { append: boolean; cursor?: string; query: string }) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        if (queryArg) params.set("q", queryArg);
        if (cursorArg) params.set("cursor", cursorArg);

        const res = await fetch(`/api/messages/recipients/groups?${params.toString()}`);
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(body?.error?.message || `HTTP ${res.status}`);
        }

        const payload = (await res.json()) as {
          items: UserGroupOption[];
          nextCursor?: string;
        };

        setItems((prev) => (append ? [...prev, ...payload.items] : payload.items));
        setCursor(payload.nextCursor);
      } catch (err: any) {
        console.error("GroupMultiSelect load error", err);
        toast({
          title: "Erro ao carregar grupos",
          description: err?.message ?? "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [toast]
  );

  useEffect(() => {
    load({ append: false, cursor: undefined, query: "" });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load({ append: false, cursor: undefined, query });
    }, 300);
  }, [query, load]);

  const toggleGroup = useCallback(
    (group: UserGroupOption) => {
      const exists = value.some((item) => item.id === group.id);
      if (exists) {
        onChange(value.filter((item) => item.id !== group.id));
      } else {
        onChange([...value, group]);
      }
    },
    [onChange, value]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((group) => (
          <Badge key={group.id} variant="outline" className="gap-2">
            <Users className="h-3 w-3" />
            {group.name}
            <button
              type="button"
              onClick={() => toggleGroup(group)}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Nenhum grupo selecionado.
          </span>
        ) : null}
      </div>

      <Input
        placeholder="Buscar grupos"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <ScrollArea className="h-40 rounded-lg border border-border">
        <div className="space-y-1 p-2">
          {items.map((group) => {
            const checked = value.some((item) => item.id === group.id);
            return (
              <label
                key={group.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleGroup(group)}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{group.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {group.membersCount} membro(s)
                    </span>
                  </div>
                </div>
                {group.color ? (
                  <span
                    className="h-3 w-3 rounded-full border"
                    style={{ backgroundColor: group.color }}
                  />
                ) : null}
              </label>
            );
          })}

          {items.length === 0 && !loading ? (
            <p className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhum resultado.
            </p>
          ) : null}

          {loading ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              Carregando...
            </p>
          ) : null}
        </div>
      </ScrollArea>

      {cursor ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => load({ append: true, cursor, query })}
          disabled={loading}
        >
          Carregar mais
        </Button>
      ) : null}
    </div>
  );
}
