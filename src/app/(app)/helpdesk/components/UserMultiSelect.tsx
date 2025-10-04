"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

export interface UserOption {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
}

interface UserMultiSelectProps {
  value: UserOption[];
  onChange: (users: UserOption[]) => void;
}

export function UserMultiSelect({ value, onChange }: UserMultiSelectProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<UserOption[]>([]);
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

        const res = await fetch(`/api/helpdesk/recipients/users?${params.toString()}`);
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
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((user) => (
          <Badge key={user.id} variant="secondary" className="gap-2">
            {user.full_name || user.id}
            <button
              type="button"
              onClick={() => toggleUser(user)}
              className="rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        {value.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            Nenhum usuário selecionado.
          </span>
        ) : null}
      </div>

      <Input
        placeholder="Buscar usuários"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <ScrollArea className="h-48 rounded-lg border border-border">
        <div className="space-y-1 p-2">
          {items.map((user) => {
            const checked = value.some((item) => item.id === user.id);
            return (
              <label
                key={user.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleUser(user)}
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {user.full_name || "Usuário sem nome"}
                  </span>
                  <span className="text-xs text-muted-foreground">{user.id}</span>
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
          disabled={loading}
        >
          Carregar mais
        </Button>
      ) : null}
    </div>
  );
}
