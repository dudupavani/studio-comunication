"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useMultiSelect } from "@/hooks/use-multi-select";

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
  apiBase = "/api/users/recipients",
  stretchList = false,
}: UserMultiSelectProps) {
  const { items, loading, query, setQuery, cursor, load } =
    useMultiSelect<UserOption>({
      endpoint: "users",
      apiBase,
      errorTitle: "Erro ao carregar usuários",
    });

  const toggleUser = useCallback(
    (user: UserOption) => {
      const exists = value.some((item) => item.id === user.id);
      onChange(exists ? value.filter((item) => item.id !== user.id) : [...value, user]);
    },
    [onChange, value]
  );

  return (
    <div className={cn("space-y-3", stretchList && "flex flex-col")}>
      {showSelectedSummary ? (
        <div className="flex flex-wrap gap-2">
          {value.map((user) => (
            <Badge key={user.id} variant="secondary">
              {user.full_name || "Usuário sem nome"}
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
            stretchList
              ? "flex-1 min-h-0 max-h-[500px] overflow-y-auto"
              : "max-h-full"
          )}>
          <div className="space-y-1">
            {items.map((user) => {
              const checked = value.some((item) => item.id === user.id);
              return (
                <label
                  key={user.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1 hover:bg-muted">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleUser(user)}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">
                      {user.full_name || "Usuário sem nome"}
                    </span>
                    {user.cargo ? (
                      <span className="text-xs text-muted-foreground">
                        {user.cargo}
                      </span>
                    ) : null}
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
