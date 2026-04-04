"use client";

import { CirclePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { CommunityItem } from "./types";

type CommunitySelectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communities: CommunityItem[];
  loading: boolean;
  canManage: boolean;
  onSelect: (communityId: string) => void;
  onCreate: () => void;
};

export function CommunitySelectionDialog({
  open,
  onOpenChange,
  communities,
  loading,
  canManage,
  onSelect,
  onCreate,
}: CommunitySelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Selecionar comunidade</DialogTitle>
          <DialogDescription>
            Escolha a comunidade para abrir o feed consolidado e os espaços.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : communities.length === 0 ? (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Ainda não há comunidades disponíveis para sua organização.
            </p>
            {canManage ? (
              <Button onClick={onCreate}>
                <CirclePlus />
                Criar primeira comunidade
              </Button>
            ) : null}
          </div>
        ) : (
          <ScrollArea className="h-72 rounded-md border p-2">
            <div className="space-y-2">
              {communities.map((community) => (
                <Button
                  key={community.id}
                  variant="ghost"
                  className="h-auto w-full justify-between px-3 py-3"
                  onClick={() => onSelect(community.id)}>
                  <span className="text-left">
                    <span className="block text-sm font-medium">
                      {community.name}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {community.visibility === "global"
                        ? "Global"
                        : "Segmentada"}
                    </span>
                  </span>
                  <Badge variant="outline">{community.spacesCount}</Badge>
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
