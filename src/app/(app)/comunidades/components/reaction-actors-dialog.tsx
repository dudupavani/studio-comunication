"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactionActor } from "@/lib/reactions/core";

type ReactionActorsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading: boolean;
  actors: ReactionActor[];
  title?: string;
};

function getInitials(value: string | null) {
  if (!value) return "--";
  const initials = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "--";
}

export function ReactionActorsDialog({
  open,
  onOpenChange,
  loading,
  actors,
  title = "Curtidas",
}: ReactionActorsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : actors.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Ainda não há curtidas nesta publicação.
          </p>
        ) : (
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {actors.map((actor) => (
              <div
                key={actor.userId}
                className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                <Avatar className="h-8 w-8">
                  {actor.avatarUrl ? (
                    <AvatarImage
                      src={actor.avatarUrl}
                      alt={actor.fullName ?? "Usuário"}
                    />
                  ) : null}
                  <AvatarFallback className="text-xs font-semibold">
                    {getInitials(actor.fullName)}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium">
                  {actor.fullName?.trim() || "Usuário sem nome"}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
