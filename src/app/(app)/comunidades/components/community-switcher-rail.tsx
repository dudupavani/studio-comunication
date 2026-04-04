"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CommunityItem } from "./types";

type CommunitySwitcherRailProps = {
  communities: CommunityItem[];
  communitiesLoading: boolean;
  selectedCommunityId: string | null;
  canManage: boolean;
  onSelectCommunity: (communityId: string) => void;
  onCreateCommunity: () => void;
};

function getCommunityInitial(name: string) {
  const normalized = name.trim();
  if (!normalized) return "C";
  return normalized[0]?.toUpperCase() ?? "C";
}

export function CommunitySwitcherRail({
  communities,
  communitiesLoading,
  selectedCommunityId,
  canManage,
  onSelectCommunity,
  onCreateCommunity,
}: CommunitySwitcherRailProps) {
  return (
    <aside className="hidden min-h-dvh border-r border-border bg-background lg:flex lg:w-20 lg:flex-col lg:items-center lg:py-4">
      <TooltipProvider delayDuration={120}>
        <div className="flex w-full flex-1 flex-col items-center gap-3 px-2">
          {canManage ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-md"
                  className="rounded-xl"
                  onClick={onCreateCommunity}
                  aria-label="Criar comunidade">
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Criar comunidade</TooltipContent>
            </Tooltip>
          ) : null}

          {communitiesLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`community-rail-skeleton-${index}`}
                  className="h-12 w-12 animate-pulse rounded-xl bg-muted"
                />
              ))
            : communities.map((community) => {
                const isActive = selectedCommunityId === community.id;
                return (
                  <Tooltip key={community.id}>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(
                          "h-12 w-12 rounded-xl border border-transparent p-0 text-xl font-semibold",
                          isActive
                            ? "border-border bg-neutral-900! text-white! hover:bg-neutral-900! hover:text-white!"
                            : "bg-muted/40 text-foreground hover:bg-muted",
                        )}
                        onClick={() => onSelectCommunity(community.id)}
                        aria-label={`Abrir comunidade ${community.name}`}>
                        {getCommunityInitial(community.name)}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{community.name}</TooltipContent>
                  </Tooltip>
                );
              })}
        </div>
      </TooltipProvider>
    </aside>
  );
}
