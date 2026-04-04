"use client";

import { ArrowUpRight, ChevronDown, Plus, Rss } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const sidebarQuickLinks = [
    { label: "Baixe o aplicativo Android", icon: ArrowUpRight },
    { label: "Baixe o aplicativo iOS", icon: ArrowUpRight },
  ];

  return (
    <aside className="flex min-h-dvh flex-col border-r border-border">
      <div className="flex items-start justify-between gap-3 border-b px-5 py-3">
        <div className="min-w-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-auto px-0 py-0 hover:bg-transparent">
                <span className="text-lg font-semibold truncate">
                  {activeCommunity?.name ?? "Selecionar comunidade"}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Configurações gerais</DropdownMenuItem>
              <DropdownMenuItem>Permissões da comunidade</DropdownMenuItem>
              <DropdownMenuItem>Integrações da comunidade</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-6 px-4 py-4">
          <Button
            variant="ghost"
            className={cn(
              "h-auto w-full justify-start rounded-xl px-4 py-3 font-medium",
              !selectedSpaceId &&
                "bg-neutral-900! text-white! hover:bg-neutral-900! hover:text-white!",
            )}
            onClick={onNavigateToFeed}
            disabled={!selectedCommunityId || detailLoading}>
            <Rss className="h-4 w-4" />
            Feed
          </Button>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h5>Espaços</h5>
              {canManage ? (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onOpenCreateSpace}
                  disabled={!selectedCommunityId || detailLoading}>
                  <Plus />
                </Button>
              ) : null}
            </div>

            {detailLoading || !communityDetail ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : communityDetail.spaces.length > 0 ? (
              <ScrollArea className="max-h-72 rounded-xl">
                <div className="space-y-1 pr-1">
                  {communityDetail.spaces.map((space) => (
                    <Button
                      key={space.id}
                      variant="ghost"
                      className={cn(
                        "h-auto w-full justify-start px-4 py-3",
                        selectedSpaceId === space.id &&
                          "bg-primary! text-white! hover:bg-neutral-200! hover:text-white!",
                      )}
                      onClick={() => onNavigateToSpace(space.id)}>
                      <span className="truncate">{space.name}</span>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="px-1 text-sm text-muted-foreground">
                Nenhum espaço criado nesta comunidade.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3>Links</h3>
            <div className="space-y-1">
              {sidebarQuickLinks.map((link) => (
                <Button
                  key={link.label}
                  variant="ghost"
                  className="h-auto w-full justify-start rounded-xl px-4 py-3 text-left text-muted-foreground"
                  disabled>
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              ))}
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}
