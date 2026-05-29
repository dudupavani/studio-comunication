"use client";

import { useCallback } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMultiSelect } from "@/hooks/use-multi-select";

export interface UserGroupOption {
  id: string;
  name: string;
  membersCount: number;
  color?: string | null;
}

interface GroupMultiSelectProps {
  value: UserGroupOption[];
  onChange: (groups: UserGroupOption[]) => void;
  showSelectedSummary?: boolean;
  apiBase?: string;
}

export function GroupMultiSelect({
  value,
  onChange,
  showSelectedSummary = true,
  apiBase = "/api/users/recipients",
}: GroupMultiSelectProps) {
  const { items, loading, query, setQuery, cursor, load } =
    useMultiSelect<UserGroupOption>({
      endpoint: "groups",
      apiBase,
      errorTitle: "Erro ao carregar grupos",
    });

  const toggleGroup = useCallback(
    (group: UserGroupOption) => {
      const exists = value.some((item) => item.id === group.id);
      onChange(exists ? value.filter((item) => item.id !== group.id) : [...value, group]);
    },
    [onChange, value]
  );

  return (
    <div className="space-y-3">
      {showSelectedSummary ? (
        <div className="flex flex-wrap gap-2">
          {value.map((group) => (
            <Badge key={group.id} variant="secondary">
              {group.name}
              <Button
                type="button"
                onClick={() => toggleGroup(group)}
                size="icon-xs"
                variant="ghost">
                <X />
              </Button>
            </Badge>
          ))}
          {value.length === 0 ? (
            <span className="text-xs text-muted-foreground">
              Nenhum grupo selecionado.
            </span>
          ) : null}
        </div>
      ) : null}

      <ScrollArea className="rounded-md border p-2">
        <Input
          placeholder="Buscar grupos"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="space-y-1 pt-2">
          {items.map((group) => {
            const checked = value.some((item) => item.id === group.id);
            return (
              <label
                key={group.id}
                className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-1 hover:bg-muted">
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
          disabled={loading}>
          Carregar mais
        </Button>
      ) : null}
    </div>
  );
}
