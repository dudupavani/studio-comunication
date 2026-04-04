"use client";

import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { CommunityDetail, SpaceItem } from "./types";

type CommunityContentPaneProps = {
  detailLoading: boolean;
  communityDetail: CommunityDetail | null;
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
  onOpenCreatePublication: () => void;
};

export function CommunityContentPane({
  detailLoading,
  communityDetail,
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
  onOpenCreatePublication,
}: CommunityContentPaneProps) {
  return (
    <section className="flex min-h-[inherit] flex-col bg-background">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <div className="space-y-1">
          <h4>{selectedSpace ? selectedSpace.name : "Feed"}</h4>
        </div>

        <div className="flex items-center gap-2">
          <Select defaultValue="recent">
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>{/* opções serão adicionadas depois */}</SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon-md" aria-label="Mais ações">
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

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        {detailLoading || !communityDetail ? (
          <div className="w-full max-w-2xl space-y-4">
            <Skeleton className="mx-auto h-8 w-64" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : selectedSpace ? (
          selectedSpace.spaceType === "publicacoes" ? (
            <Empty className="w-full max-w-4xl border-0 p-0">
              <EmptyHeader className="max-w-[720px] gap-4">
                <EmptyTitle>
                  <h2>Boas-vindas à sua comunidade</h2>
                </EmptyTitle>
                <EmptyDescription>
                  Seu feed é onde você verá as novas publicações.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent className="max-w-none">
                <Button
                  size="lg"
                  className="rounded-full px-10"
                  onClick={onOpenCreatePublication}>
                  Criar a primeira publicação
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <Card className="w-full max-w-2xl">
              <CardHeader>
                <h3>Detalhes do espaço</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Tipo: Eventos</p>
                <p className="text-sm text-muted-foreground">
                  O espaço está pronto para navegação, permissões e estrutura de
                  conteúdo futura.
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          <div className="max-w-2xl text-center">
            <h2>Boas-vindas à sua comunidade</h2>
            <p className="mt-4 text-base text-muted-foreground">
              Seu feed é onde você verá as novas publicações.
            </p>
            {canManage ? (
              <Button
                className="mt-8"
                onClick={onCreateSpace}
                disabled={!selectedCommunityId}>
                Criar espaço
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
