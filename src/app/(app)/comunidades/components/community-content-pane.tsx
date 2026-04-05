"use client";

import {
  ChevronDown,
  MoreHorizontal,
  Rss,
  SquareMenu,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { CommunityDetail, CommunityFeedItem, SpaceItem } from "./types";

type CommunityContentPaneProps = {
  detailLoading: boolean;
  feedLoading: boolean;
  communityDetail: CommunityDetail | null;
  feedItems: CommunityFeedItem[];
  selectedSpace: SpaceItem | null;
  canManage: boolean;
  selectedCommunityId: string | null;
  communitiesCount: number;
  onOpenSelector: () => void;
  onEditCommunity: () => void;
  onDeleteCommunity: () => void;
  onEditSpace: () => void;
  onDeleteSpace: () => void;
  onCreateSpace: () => void;
  onNavigateToSpace: (spaceId: string) => void;
  onOpenCreatePublication: () => void;
};

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function formatFeedDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function CommunityContentPane({
  detailLoading,
  feedLoading,
  communityDetail,
  feedItems,
  selectedSpace,
  canManage,
  selectedCommunityId,
  communitiesCount,
  onOpenSelector,
  onEditCommunity,
  onDeleteCommunity,
  onEditSpace,
  onDeleteSpace,
  onCreateSpace,
  onNavigateToSpace,
  onOpenCreatePublication,
}: CommunityContentPaneProps) {
  const publicationSpace =
    communityDetail?.spaces.find((space) => space.spaceType === "publicacoes") ??
    null;
  const canCreatePublication =
    !!selectedSpace &&
    selectedSpace.spaceType === "publicacoes" &&
    !!communityDetail?.canPost;
  const avatarItems = communityDetail?.spaces.slice(0, 3) ?? [];
  const showFeedItems =
    feedItems.length > 0 &&
    (!selectedSpace || selectedSpace.spaceType === "publicacoes");

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          {selectedSpace ? (
            <SquareMenu className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <Rss className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-semibold text-foreground">
            {selectedSpace ? selectedSpace.name : "Feed"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          {avatarItems.length > 0 ? (
            <div className="flex items-center pr-2">
              {avatarItems.map((space) => (
                <Avatar
                  key={space.id}
                  className="-ml-2 h-6 w-6 border border-background first:ml-0">
                  <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
                    {getInitials(space.name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          ) : null}

          <Button variant="ghost" size="sm" className="text-sm" disabled>
            Mais recentes
            <ChevronDown className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            onClick={onOpenCreatePublication}
            disabled={!canCreatePublication}>
            Nova publicação
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-sm" aria-label="Mais ações">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={onOpenSelector}
                disabled={communitiesCount === 0}>
                Trocar comunidade
              </DropdownMenuItem>
              {canManage ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onEditCommunity}>
                    Editar comunidade
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDeleteCommunity}>
                    Remover comunidade
                  </DropdownMenuItem>
                  {selectedSpace ? (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onEditSpace}>
                        Editar espaço
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={onDeleteSpace}>
                        Remover espaço
                      </DropdownMenuItem>
                    </>
                  ) : null}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div
        className={
          showFeedItems
            ? "flex flex-1 justify-center px-6 py-8"
            : "flex flex-1 items-center justify-center px-6 py-12"
        }>
        {detailLoading || feedLoading ? (
          <div className="w-full max-w-2xl space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !communityDetail ? (
          <Empty className="w-full max-w-3xl border-0">
            <EmptyHeader>
              <EmptyTitle>
                <h2>Selecione uma comunidade</h2>
              </EmptyTitle>
              <EmptyDescription>
                Abra uma comunidade para ver o feed consolidado e os espaços.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : selectedSpace ? (
          selectedSpace.spaceType === "publicacoes" ? showFeedItems ? (
            <div className="w-full max-w-3xl space-y-4">
              {feedItems.map((item) => (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border bg-background">
                  {item.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.coverUrl}
                      alt={item.title ?? "Capa da publicação"}
                      className="h-52 w-full object-cover"
                    />
                  ) : null}
                  <div className="space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-muted px-2 py-1 text-foreground">
                        {item.spaceName ?? selectedSpace.name}
                      </span>
                      {formatFeedDate(item.createdAt) ? (
                        <span>{formatFeedDate(item.createdAt)}</span>
                      ) : null}
                      {item.authorName ? <span>por {item.authorName}</span> : null}
                    </div>
                    {item.title ? (
                      <div className="text-base font-semibold">{item.title}</div>
                    ) : null}
                    <p className="text-sm text-muted-foreground">
                      {item.excerpt?.trim() || "Publicação sem pré-visualização disponível."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty className="w-full max-w-3xl border-0">
              <EmptyHeader className="gap-4">
                <EmptyTitle>
                  <h2>Nenhuma publicação neste espaço</h2>
                </EmptyTitle>
                <EmptyDescription>
                  O conteúdo publicado neste espaço aparecerá aqui e também no feed
                  consolidado da comunidade.
                </EmptyDescription>
              </EmptyHeader>
              {communityDetail.canPost ? (
                <EmptyContent>
                  <Button onClick={onOpenCreatePublication}>
                    Criar a primeira publicação
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <Empty className="w-full max-w-3xl border-0">
              <EmptyHeader>
                <EmptyTitle>
                  <h2>Eventos em breve</h2>
                </EmptyTitle>
                <EmptyDescription>
                  Este espaço já faz parte da navegação da comunidade, mas a
                  experiência de eventos continua como placeholder nesta versão.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )
        ) : showFeedItems ? (
          <div className="w-full max-w-3xl space-y-4">
            {feedItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-xl border border-border bg-background">
                {item.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.coverUrl}
                    alt={item.title ?? "Capa da publicação"}
                    className="h-52 w-full object-cover"
                  />
                ) : null}
                <div className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-1 text-foreground">
                      {item.spaceName ?? "Espaço"}
                    </span>
                    {formatFeedDate(item.createdAt) ? (
                      <span>{formatFeedDate(item.createdAt)}</span>
                    ) : null}
                    {item.authorName ? <span>por {item.authorName}</span> : null}
                  </div>
                  {item.title ? (
                    <div className="text-base font-semibold">{item.title}</div>
                  ) : null}
                  <p className="text-sm text-muted-foreground">
                    {item.excerpt?.trim() || "Publicação sem pré-visualização disponível."}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <Empty className="w-full max-w-3xl border-0">
            <EmptyHeader className="gap-4">
              <EmptyTitle>
                <h2>Boas-vindas à sua comunidade</h2>
              </EmptyTitle>
              <EmptyDescription>
                Seu feed é onde você verá as novas publicações.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {publicationSpace && communityDetail.canPost ? (
                <Button onClick={() => onNavigateToSpace(publicationSpace.id)}>
                  Criar a primeira publicação
                </Button>
              ) : canManage ? (
                <Button
                  onClick={onCreateSpace}
                  disabled={!selectedCommunityId}>
                  Criar a primeira publicação
                </Button>
              ) : null}
            </EmptyContent>
          </Empty>
        )}
      </div>
    </section>
  );
}
