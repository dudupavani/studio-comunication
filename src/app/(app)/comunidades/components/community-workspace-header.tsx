"use client";

import { ChevronsUpDown } from "lucide-react";

import { GlobalHeaderActions } from "@/components/global-header-actions";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { Profile } from "@/lib/types";
import type { CommunityDetail, CommunityItem } from "./types";

type CommunityWorkspaceHeaderProps = {
  activeCommunity: CommunityItem | CommunityDetail | null;
  isFeedView: boolean;
  onOpenSelector: () => void;
  onNavigateToFeed: () => void;
  user: Profile;
};

export function CommunityWorkspaceHeader({
  activeCommunity,
  isFeedView,
  onOpenSelector,
  onNavigateToFeed,
  user,
}: CommunityWorkspaceHeaderProps) {
  return (
    <header className="border-b border-border bg-background">
      <div className="flex flex-col gap-4 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4"
            />
            <Button
              variant="ghost"
              className="h-auto justify-start px-0 py-0 hover:bg-transparent"
              onClick={onOpenSelector}>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
              <span className="truncate text-base font-semibold text-foreground">
                {activeCommunity?.name ?? "Selecionar comunidade"}
              </span>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className={isFeedView ? "border-border bg-muted" : ""}
              onClick={onNavigateToFeed}>
              Home
            </Button>
            <Button variant="outline" size="sm" disabled>
              Eventos
            </Button>
          </div>
        </div>

        <GlobalHeaderActions user={user} />
      </div>
    </header>
  );
}
