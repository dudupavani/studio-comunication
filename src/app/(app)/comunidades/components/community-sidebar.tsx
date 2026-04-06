"use client";

import { MoreVertical, Plus, Rss, SquareMenu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CommunityDetail, CommunityItem } from "./types";

type CommunitySidebarProps = {
  activeCommunity: CommunityItem | CommunityDetail | null;
  selectedCommunityId: string | null;
  selectedSpaceId: string | null;
  detailLoading: boolean;
  communityDetail: CommunityDetail | null;
  canManage: boolean;
  onNavigateToFeed: () => void;
  onNavigateToSpace: (spaceId: string) => void;
  onOpenCreateSpace: () => void;
};

export function CommunitySidebar({
  activeCommunity,
  selectedCommunityId,
  selectedSpaceId,
  detailLoading,
  communityDetail,
  canManage,
  onNavigateToFeed,
  onNavigateToSpace,
  onOpenCreateSpace,
}: CommunitySidebarProps) {
  const spaceGroups = [
    {
      id: "publicacoes",
      label: "Publicações",
      items:
        communityDetail?.spaces.filter(
          (space) => space.spaceType === "publicacoes",
        ) ?? [],
    },
    {
      id: "eventos",
      label: "Eventos",
      items:
        communityDetail?.spaces.filter(
          (space) => space.spaceType === "eventos",
        ) ?? [],
    },
  ].filter((group) => group.items.length > 0);

  return (
    <aside className="w-full border-b border-border bg-background lg:h-full lg:w-54 lg:border-b-0 lg:border-r">
      <ScrollArea className="h-full">
        <div className="space-y-6 px-5 py-7">
          <Button
            variant="ghost"
            className={cn(
              "h-8 w-full justify-start rounded-md px-4 text-sm font-medium",
              !selectedSpaceId && "bg-primary text-white",
            )}
            onClick={onNavigateToFeed}
            disabled={!selectedCommunityId || detailLoading}>
            <Rss size={16} />
            Feed
          </Button>

          <section className="space-y-3">
            {detailLoading || !communityDetail ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : spaceGroups.length > 0 ? (
              <div className="space-y-6">
                {spaceGroups.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        {group.label}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          type="button"
                          aria-label={`Mais ações de ${group.label}`}
                          disabled>
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {canManage ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            type="button"
                            aria-label={`Criar espaço em ${group.label}`}
                            onClick={onOpenCreateSpace}
                            disabled={!selectedCommunityId || detailLoading}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-1">
                      {group.items.map((space) => (
                        <Button
                          key={space.id}
                          variant="ghost"
                          className={cn(
                            "h-8 w-full justify-start rounded-md px-3 text-sm font-medium",
                            selectedSpaceId === space.id &&
                              "bg-muted hover:bg-muted",
                          )}
                          onClick={() => onNavigateToSpace(space.id)}>
                          <SquareMenu className="h-4 w-4" />
                          <span className="truncate">{space.name}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : activeCommunity ? (
              <div className="flex flex-col items-start gap-2">
                <span className="text-base font-semibold">Espaços</span>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={onOpenCreateSpace}>
                    <Plus size={16} />
                    Criar espaço
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-5">
                <p className="text-sm text-muted-foreground">
                  Selecione uma comunidade para ver os espaços.
                </p>
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
