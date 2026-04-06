"use client";

import { useState } from "react";
import {
  ChevronDown,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Rss,
  SquareMenu,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import type { ReactionActor } from "@/lib/reactions/core";
import { ReactionActorsDialog } from "./reaction-actors-dialog";
import type { CommunityDetail, CommunityFeedItem, SpaceItem } from "./types";

type CommunityContentPaneProps = {
  detailLoading: boolean;
  feedLoading: boolean;
  communityDetail: CommunityDetail | null;
  feedItems: CommunityFeedItem[];
  selectedSpace: SpaceItem | null;
  canManage: boolean;
  selectedCommunityId: string | null;
  currentUserId: string;
  communitiesCount: number;
  onOpenSelector: () => void;
  onEditCommunity: () => void;
  onDeleteCommunity: () => void;
  onEditSpace: () => void;
  onDeleteSpace: () => void;
  onCreateSpace: () => void;
  onNavigateToSpace: (spaceId: string) => void;
  onOpenCreatePublication: () => void;
  onViewPublication: (item: CommunityFeedItem) => Promise<void>;
  onEditPublication: (item: CommunityFeedItem) => Promise<void>;
  onDeletePublication: (item: CommunityFeedItem) => Promise<boolean>;
  onToggleReaction: (item: CommunityFeedItem, emoji?: "👍") => Promise<boolean>;
  onLoadReactionActors: (
    item: CommunityFeedItem,
    emoji?: "👍",
  ) => Promise<ReactionActor[]>;
  reactingPublicationId: string | null;
  deletingPublicationId: string | null;
};

function getInitials(value: string | null) {
  if (!value) return "--";
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

function formatLikeCountLabel(count: number) {
  return `${count} ${count === 1 ? "curtida" : "curtidas"}`;
}

function formatCommentsCountLabel(count = 0) {
  return `${count} ${count === 1 ? "Comentário" : "Comentários"}`;
}

export function CommunityContentPane({
  detailLoading,
  feedLoading,
  communityDetail,
  feedItems,
  selectedSpace,
  canManage,
  selectedCommunityId,
  currentUserId,
  communitiesCount,
  onOpenSelector,
  onEditCommunity,
  onDeleteCommunity,
  onEditSpace,
  onDeleteSpace,
  onCreateSpace,
  onNavigateToSpace,
  onOpenCreatePublication,
  onViewPublication,
  onEditPublication,
  onDeletePublication,
  onToggleReaction,
  onLoadReactionActors,
  reactingPublicationId,
  deletingPublicationId,
}: CommunityContentPaneProps) {
  const [likersDialogOpen, setLikersDialogOpen] = useState(false);
  const [likersDialogLoading, setLikersDialogLoading] = useState(false);
  const [likersDialogActors, setLikersDialogActors] = useState<ReactionActor[]>(
    [],
  );
  const publicationSpace =
    communityDetail?.spaces.find(
      (space) => space.spaceType === "publicacoes",
    ) ?? null;
  const canCreatePublication =
    !!selectedSpace &&
    selectedSpace.spaceType === "publicacoes" &&
    !!communityDetail?.canPost;
  const avatarItems = communityDetail?.spaces.slice(0, 3) ?? [];
  const showFeedItems =
    feedItems.length > 0 &&
    (!selectedSpace || selectedSpace.spaceType === "publicacoes");
  const canManagePublication = (item: CommunityFeedItem) =>
    canManage || item.authorId === currentUserId;

  async function openLikersDialog(item: CommunityFeedItem) {
    setLikersDialogOpen(true);
    setLikersDialogLoading(true);
    const actors = await onLoadReactionActors(item, "👍");
    setLikersDialogActors(actors);
    setLikersDialogLoading(false);
  }

  const renderPublicationItem = (item: CommunityFeedItem) => {
    const likeSummary = item.reactions?.find((reaction) => reaction.emoji === "👍");
    const likeCount = likeSummary?.count ?? 0;
    const likePreviewUser = likeSummary?.previewUsers[0];
    const authorName = item.authorName?.trim() || "Usuário sem nome";
    const createdLabel = formatFeedDate(item.createdAt);

    return (
      // Cards da timeline abrem a visualização completa e precisam indicar clique.
      <article
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => {
          void onViewPublication(item);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void onViewPublication(item);
          }
        }}
        className="relative cursor-pointer overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-md">
        {item.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverUrl}
            alt={item.title ?? "Capa da publicação"}
            className="h-52 w-full object-cover"
          />
        ) : null}
        {canManagePublication(item) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute right-3 top-3 z-10 cursor-pointer bg-background/90 backdrop-blur"
                aria-label="Ações da publicação"
                onClick={(event) => {
                  event.stopPropagation();
                }}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void onEditPublication(item);
                }}>
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                disabled={deletingPublicationId === item.id}
                onSelect={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const confirmed = window.confirm(
                    "Tem certeza que deseja excluir esta publicação?",
                  );
                  if (!confirmed) return;
                  void onDeletePublication(item);
                }}>
                {deletingPublicationId === item.id ? "Excluindo..." : "Excluir"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <div className="space-y-4 p-5">
          {item.title ? <div className="text-xl font-semibold">{item.title}</div> : null}

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              {item.authorAvatarUrl ? (
                <AvatarImage src={item.authorAvatarUrl} alt={authorName} />
              ) : null}
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(authorName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{authorName}</p>
              {createdLabel ? (
                <p className="text-xs text-muted-foreground">{createdLabel}</p>
              ) : null}
            </div>
          </div>

          <p className="text-base">
            {item.excerpt?.trim() || "Publicação sem pré-visualização disponível."}
          </p>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={reactingPublicationId === item.id}
                aria-label={likeSummary?.reacted ? "Remover curtida" : "Curtir publicação"}
                onClick={(event) => {
                  event.stopPropagation();
                  void onToggleReaction(item, "👍");
                }}>
                <Heart
                  className={`h-5 w-5 ${likeSummary?.reacted ? "fill-red-500 text-red-500" : "text-foreground"}`}
                />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Comentários em breve"
                onClick={(event) => {
                  event.stopPropagation();
                }}>
                <MessageCircle className="h-5 w-5 text-foreground" />
              </Button>
            </div>

            <button
              type="button"
              disabled={likeCount === 0}
              onClick={(event) => {
                event.stopPropagation();
                if (likeCount === 0) return;
                void openLikersDialog(item);
              }}
              className="flex items-center gap-2 text-sm disabled:cursor-default disabled:opacity-70">
              <Avatar className="h-6 w-6">
                {likePreviewUser?.avatarUrl ? (
                  <AvatarImage
                    src={likePreviewUser.avatarUrl}
                    alt={likePreviewUser.fullName ?? "Usuário que curtiu"}
                  />
                ) : null}
                <AvatarFallback className="text-[10px] font-semibold">
                  {getInitials(likePreviewUser?.fullName ?? null)}
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold">{formatLikeCountLabel(likeCount)}</span>
              <span className="text-muted-foreground">
                {formatCommentsCountLabel(0)}
              </span>
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <>
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
            ? "flex flex-1 justify-center px-6 py-8 bg-neutral-50"
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
          selectedSpace.spaceType === "publicacoes" ? (
            showFeedItems ? (
              <div className="w-full max-w-3xl space-y-4">
                {/* <--  Item de cada post de publicação --> */}
                {feedItems.map(renderPublicationItem)}
              </div>
            ) : (
              <Empty className="w-full max-w-3xl border-0">
                <EmptyHeader className="gap-4">
                  <EmptyTitle>
                    <h2>Nenhuma publicação neste espaço</h2>
                  </EmptyTitle>
                  <EmptyDescription>
                    O conteúdo publicado neste espaço aparecerá aqui e também no
                    feed consolidado da comunidade.
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
            )
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
            {feedItems.map(renderPublicationItem)}
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
                <Button onClick={onCreateSpace} disabled={!selectedCommunityId}>
                  Criar a primeira publicação
                </Button>
              ) : null}
            </EmptyContent>
          </Empty>
        )}
      </div>
      </section>
      <ReactionActorsDialog
        open={likersDialogOpen}
        onOpenChange={setLikersDialogOpen}
        loading={likersDialogLoading}
        actors={likersDialogActors}
        title="Curtidas da publicação"
      />
    </>
  );
}
