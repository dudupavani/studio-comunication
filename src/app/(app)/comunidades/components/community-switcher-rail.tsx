"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AppWindowMac,
  Calendar,
  Inbox,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CommunityItem } from "./types";

type CommunitySwitcherRailProps = {
  communities: CommunityItem[];
  communitiesLoading: boolean;
  selectedCommunityId: string | null;
  canCreateCommunity: boolean;
  onSelectCommunity: (communityId: string) => void;
  onCreateCommunity: () => void;
};

function getCommunityInitial(name: string) {
  const normalized = name.trim();
  if (!normalized) return "C";
  return normalized[0]?.toUpperCase() ?? "C";
}

const managementLinks = [
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/calendar", label: "Calendário", icon: Calendar },
  { href: "/dashboard", label: "Dashboard", icon: AppWindowMac },
];

export function CommunitySwitcherRail({
  communities,
  communitiesLoading,
  selectedCommunityId,
  canCreateCommunity,
  onSelectCommunity,
  onCreateCommunity,
}: CommunitySwitcherRailProps) {
  return (
    <aside className="flex w-full flex-col gap-8 border-b border-border bg-background px-4 py-6 lg:min-h-[100dvh] lg:w-[214px] lg:border-b-0 lg:border-r lg:px-[15px] lg:py-[25px]">
      <Link href="/comunidades" className="flex items-center gap-3">
        <Image
          src="/logo.png"
          alt="Logo"
          width={27}
          height={27}
          className="h-[27px] w-[27px] object-contain"
        />
        <span className="text-sm font-medium text-foreground">Logo</span>
      </Link>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Comunidades
          </span>
        </div>

        {canCreateCommunity ? (
          <Button
            type="button"
            variant="ghost"
            className="h-auto justify-start px-0 text-sm font-medium text-muted-foreground"
            onClick={onCreateCommunity}>
            <Plus className="h-4 w-4" />
            Criar comunidade
          </Button>
        ) : null}

        <div className="space-y-2">
          {communitiesLoading
            ? Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`community-switcher-skeleton-${index}`}
                  className="flex items-center gap-3 px-1 py-1">
                  <Skeleton className="h-9 w-9 rounded-lg" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))
            : communities.map((community) => {
                const isActive = selectedCommunityId === community.id;
                return (
                  <Button
                    key={community.id}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "h-auto w-full justify-start gap-3 rounded-md px-0 py-1.5",
                      isActive && "bg-transparent",
                    )}
                    onClick={() => onSelectCommunity(community.id)}
                    aria-label={`Abrir comunidade ${community.name}`}>
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-zinc-700 text-sm font-semibold text-zinc-50",
                        isActive && "bg-zinc-900",
                      )}>
                      {getCommunityInitial(community.name)}
                    </span>
                    <span className="truncate text-sm font-medium text-foreground">
                      {community.name}
                    </span>
                  </Button>
                );
              })}
        </div>

      </section>

      <section className="space-y-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
          Gestão
        </span>

        <div className="space-y-1">
          {managementLinks.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              className="h-auto w-full justify-start rounded-md px-3 py-2 text-sm font-medium"
              asChild>
              <Link href={item.href}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          ))}
        </div>
      </section>
    </aside>
  );
}
