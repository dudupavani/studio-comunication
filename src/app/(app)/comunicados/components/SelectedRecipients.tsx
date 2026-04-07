"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { UserOption } from "@/components/communication/UserMultiSelect";
import type { UserGroupOption } from "@/components/communication/GroupMultiSelect";
import type { TeamOption } from "@/components/communication/TeamMultiSelect";

type SelectedRecipientsProps = {
  users: UserOption[];
  groups: UserGroupOption[];
  teams: TeamOption[];
  total: number;
  onRemoveUser: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  onRemoveTeam: (id: string) => void;
};

export function SelectedRecipients({
  users,
  groups,
  teams,
  total,
  onRemoveUser,
  onRemoveGroup,
  onRemoveTeam,
}: SelectedRecipientsProps) {
  if (!users.length && !groups.length && !teams.length) {
    return (
      <div className="rounded-lg bg-muted border border-dashed border-border px-4 py-3 text-xs text-center text-muted-foreground">
        Nenhum destinatário selecionado. Utilize as abas da direita para
        adicionar usuários, grupos ou equipes.
      </div>
    );
  }

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-2">
        <h6>Destinatários selecionados ({total})</h6>
      </div>
      <div className="space-y-3 rounded-lg border border-border px-4 py-3">
        {users.length ? (
          <RecipientBadgeList
            label="Usuários"
            items={users.map((u) => ({ id: u.id, label: u.full_name || u.id }))}
            onRemove={onRemoveUser}
          />
        ) : null}
        {groups.length ? (
          <RecipientBadgeList
            label="Grupos"
            items={groups.map((g) => ({ id: g.id, label: g.name }))}
            onRemove={onRemoveGroup}
          />
        ) : null}
        {teams.length ? (
          <RecipientBadgeList
            label="Equipes"
            items={teams.map((t) => ({ id: t.id, label: t.name }))}
            onRemove={onRemoveTeam}
          />
        ) : null}
      </div>
    </div>
  );
}

function RecipientBadgeList({
  label,
  items,
  onRemove,
}: {
  label: string;
  items: { id: string; label: string }[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item.id} variant="secondary" className="gap-2">
            {item.label}
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => onRemove(item.id)}>
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
