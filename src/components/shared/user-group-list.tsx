"use client";

import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

type GroupInfo = {
  id: string;
  name: string;
  color?: string | null;
};

type UserGroupListProps = {
  groups: GroupInfo[];
  userName: string;
  userTitle?: string | null;
  className?: string;
  maxVisible?: number;
};

function GroupDot({ color }: { color?: string | null }) {
  return (
    <span
      className="inline-flex -ml-1 h-4 w-4 items-center justify-center rounded-full border border-white shadow-sm"
      style={{
        backgroundColor: color ?? "var(--muted)",
      }}
    />
  );
}

export function UserGroupList({
  groups,
  userName,
  userTitle,
  className,
  maxVisible = 4,
}: UserGroupListProps) {
  const visible = groups.slice(0, maxVisible);
  const remaining = Math.max(0, groups.length - visible.length);

  if (groups.length === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Sem grupos</span>
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 rounded-md border border-border pl-3 pr-2 py-1 transition hover:bg-white",
            className
          )}>
          <div className="flex items-center">
            {visible.map((group) => (
              <GroupDot key={group.id} color={group.color ?? undefined} />
            ))}
            {remaining > 0 ? (
              <Badge variant="outline" className="text-xs font-semibold ml-1">
                +{remaining}
              </Badge>
            ) : null}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{userName}</p>
          {userTitle ? (
            <p className="text-xs text-muted-foreground">{userTitle}</p>
          ) : null}
        </div>
        <div className="space-y-1">
          {groups.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-2 rounded-lg border border-border p-2">
              <GroupDot color={group.color ?? undefined} />
              <span className="text-xs font-medium line-clamp-1">
                {group.name}
              </span>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
