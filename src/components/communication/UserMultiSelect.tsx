"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export interface UserOption {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  cargo?: string | null;
}

interface UserMultiSelectProps {
  value: UserOption[];
  onChange: (users: UserOption[]) => void;
  showSelectedSummary?: boolean;
  apiBase?: string;
  stretchList?: boolean;
}

export function UserMultiSelect({
  value,
  onChange,
  showSelectedSummary = true,
  apiBase = "/api/chats/recipients",
  stretchList = false,
}: UserMultiSelectProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<UserOption[]>([]);
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

        const res = await fetch(`${apiBase}/users?${params.toString()}`, {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as any;
          throw new Error(body?.error?.message || `HTTP ${res.status}`);
        }
        const payload = (await res.json()) as {
          items: UserOption[];
          nextCursor?: string;
        };
        setItems((prev) =>
          append ? [...prev, ...payload.items] : payload.items
        );
        setCursor(payload.nextCursor);
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        console.error("UserMultiSelect load error", err);
        toast({
          title: "Erro ao carregar usuários",
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

  const toggleUser = useCallback(
    (user: UserOption) => {
      const exists = value.some((item) => item.id === user.id);
      if (exists) {
        onChange(value.filter((item) => item.id !== user.id));
      } else {
        onChange([...value, user]);
      }
    },
    [onChange, value]
  );

  return (
    <div
      className={cn(
        "space-y-3",
        stretchList && "flex h-full min-h-0 flex-col"
      )}>
      {showSelectedSummary ? (
        <div className="flex flex-wrap gap-2">
          {value.map((user) => (
            <Badge key={user.id} variant="secondary">
              {user.full_name || user.id}
              <Button
                type="button"
                onClick={() => toggleUser(user)}
                size="icon-xs"
                variant="ghost">
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          {value.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Nenhum usuário selecionado.
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "rounded-md border p-2",
          stretchList ? "flex flex-1 min-h-0 flex-col gap-2" : "space-y-2"
        )}>
        <Input
          placeholder="Buscar usuários"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ScrollArea
          className={cn(
            "rounded-md",
            stretchList ? "flex-1 min-h-0" : "max-h-64"
          )}>
          <div className="space-y-1">
            {items.map((user) => {
              const checked = value.some((item) => item.id === user.id);
              return (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleUser(user)}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user.full_name || "Usuário sem nome"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user.id}
                    </span>
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
      </div>

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
