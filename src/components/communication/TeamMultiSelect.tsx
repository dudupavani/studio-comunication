"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Users2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export interface TeamOption {
  id: string;
  name: string;
  membersCount: number;
}

interface TeamMultiSelectProps {
  value: TeamOption[];
  onChange: (teams: TeamOption[]) => void;
  showSelectedSummary?: boolean;
  apiBase?: string;
}

export function TeamMultiSelect({
  value,
  onChange,
  showSelectedSummary = true,
  apiBase = "/api/users/recipients",
}: TeamMultiSelectProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const load = useCallback(
    async ({
      append,
      cursor: cursorArg,
      query: queryArg,
    }: {
      append: boolean;
      cursor?: string;
      query: string;
    }) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "20");
        if (queryArg) params.set("q", queryArg);
        if (cursorArg) params.set("cursor", cursorArg);

        const res = await fetch(`${apiBase}/teams?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(body?.error?.message || `HTTP ${res.status}`);
        }
        const payload = (await res.json()) as {
          items: TeamOption[];
          nextCursor?: string;
        };
        setItems((prev) =>
          append ? [...prev, ...payload.items] : payload.items
        );
        setCursor(payload.nextCursor);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("TeamMultiSelect load error", err);
        toast({
          title: "Erro ao carregar equipes",
          description: err?.message ?? "Tente novamente.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [apiBase, toast]
  );

  useEffect(() => {
    load({ append: false, cursor: undefined, query: "" });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [load]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load({ append: false, cursor: undefined, query });
    }, 300);
  }, [query, load]);

  const toggleTeam = useCallback(
    (team: TeamOption) => {
      const exists = value.some((item) => item.id === team.id);
      if (exists) {
        onChange(value.filter((item) => item.id !== team.id));
      } else {
        onChange([...value, team]);
      }
    },
    [onChange, value]
  );

  return (
    <div className="space-y-3">
      {showSelectedSummary ? (
        <div className="flex flex-wrap gap-2">
          {value.map((team) => (
            <Badge key={team.id} variant="secondary">
              {team.name}
              <Button
                type="button"
                onClick={() => toggleTeam(team)}
                size="icon-xs"
                variant="ghost">
                <X />
              </Button>
            </Badge>
          ))}
          {value.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Nenhuma equipe selecionada.
            </span>
          ) : null}
        </div>
      ) : null}

      <ScrollArea className="rounded-md border p-2">
        <Input
          placeholder="Buscar equipes"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="space-y-1 pt-2">
          {items.map((team) => {
            const checked = value.some((item) => item.id === team.id);
            return (
              <label
                key={team.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-muted">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleTeam(team)}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{team.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {team.membersCount} membro(s)
                    </span>
                  </div>
                </div>
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
          disabled={loading}>
          Carregar mais
        </Button>
      ) : null}
    </div>
  );
}
