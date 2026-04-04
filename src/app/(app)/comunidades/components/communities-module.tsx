"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CirclePlus,
  Layers3,
  Pencil,
  Rss,
  Trash2,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

type CommunityVisibility = "global" | "segmented";
type SegmentType = "group" | "team";
type SpaceType = "publicacoes" | "eventos";

type SpaceItem = {
  id: string;
  communityId: string;
  orgId: string;
  name: string;
  spaceType: SpaceType;
  createdAt: string;
  updatedAt: string;
};

type CommunityItem = {
  id: string;
  orgId: string;
  name: string;
  visibility: CommunityVisibility;
  segmentType: SegmentType | null;
  segmentTargetIds: string[];
  allowUnitMasterPost: boolean;
  allowUnitUserPost: boolean;
  spacesCount: number;
  canManage: boolean;
  canPost: boolean;
  createdAt: string;
  updatedAt: string;
};

type CommunityDetail = Omit<CommunityItem, "spacesCount"> & {
  spaces: SpaceItem[];
};

type SegmentOption = {
  id: string;
  name: string;
  membersCount?: number;
};

type CommunityPayload = {
  name: string;
  visibility: CommunityVisibility;
  segmentType: SegmentType | null;
  segmentTargetIds: string[];
  allowUnitMasterPost: boolean;
  allowUnitUserPost: boolean;
};

type SpacePayload = {
  name: string;
  spaceType: SpaceType;
};

type CommunitiesModuleProps = {
  canManage: boolean;
  initialCommunityId?: string;
  initialSpaceId?: string;
};

const DEFAULT_COMMUNITY_FORM: CommunityPayload = {
  name: "",
  visibility: "global",
  segmentType: null,
  segmentTargetIds: [],
  allowUnitMasterPost: true,
  allowUnitUserPost: false,
};

const DEFAULT_SPACE_FORM: SpacePayload = {
  name: "",
  spaceType: "publicacoes",
};

async function parseJson<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      payload?.error || payload?.message || `Falha na requisição (${res.status}).`;
    throw new Error(message);
  }

  return payload as T;
}

export default function CommunitiesModule({
  canManage,
  initialCommunityId,
  initialSpaceId,
}: CommunitiesModuleProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    initialCommunityId ?? null
  );
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(
    initialSpaceId ?? null
  );
  const [communityDetail, setCommunityDetail] = useState<CommunityDetail | null>(
    null
  );
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(!initialCommunityId);

  const [communityDialogMode, setCommunityDialogMode] = useState<
    "create" | "edit" | null
  >(null);
  const [spaceDialogMode, setSpaceDialogMode] = useState<"create" | "edit" | null>(
    null
  );

  const [savingCommunity, setSavingCommunity] = useState(false);
  const [savingSpace, setSavingSpace] = useState(false);

  const [confirmDeleteCommunityOpen, setConfirmDeleteCommunityOpen] =
    useState(false);
  const [confirmDeleteSpaceOpen, setConfirmDeleteSpaceOpen] = useState(false);

  const [deletingCommunity, setDeletingCommunity] = useState(false);
  const [deletingSpace, setDeletingSpace] = useState(false);

  useEffect(() => {
    setSelectedCommunityId(initialCommunityId ?? null);
    setSelectedSpaceId(initialSpaceId ?? null);
    setSelectorOpen(!initialCommunityId);
  }, [initialCommunityId, initialSpaceId]);

  const selectedSpace = useMemo(() => {
    if (!communityDetail || !selectedSpaceId) return null;
    return communityDetail.spaces.find((space) => space.id === selectedSpaceId) ?? null;
  }, [communityDetail, selectedSpaceId]);

  const reloadCommunities = useCallback(async () => {
    try {
      setCommunitiesLoading(true);
      const payload = await parseJson<{ items: CommunityItem[] }>(
        await fetch("/api/communities", { cache: "no-store" })
      );
      setCommunities(payload.items);
    } catch (error) {
      toast({
        title: "Falha ao carregar comunidades",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as comunidades.",
        variant: "destructive",
      });
      setCommunities([]);
    } finally {
      setCommunitiesLoading(false);
    }
  }, [toast]);

  const reloadCommunityDetail = useCallback(
    async (communityId: string) => {
      try {
        setDetailLoading(true);
        const payload = await parseJson<{ item: CommunityDetail }>(
          await fetch(`/api/communities/${communityId}`, { cache: "no-store" })
        );

        setCommunityDetail(payload.item);

        if (
          selectedSpaceId &&
          !payload.item.spaces.some((space) => space.id === selectedSpaceId)
        ) {
          setSelectedSpaceId(null);
          router.replace(`/comunidades/${communityId}`);
        }
      } catch (error) {
        setCommunityDetail(null);
        toast({
          title: "Falha ao carregar comunidade",
          description:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar os dados da comunidade.",
          variant: "destructive",
        });
        router.replace("/comunidades");
        setSelectedCommunityId(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [router, selectedSpaceId, toast]
  );

  useEffect(() => {
    reloadCommunities();
  }, [reloadCommunities]);

  useEffect(() => {
    if (!selectedCommunityId) {
      setCommunityDetail(null);
      return;
    }

    reloadCommunityDetail(selectedCommunityId);
  }, [reloadCommunityDetail, selectedCommunityId]);

  useEffect(() => {
    if (communitiesLoading) return;

    if (!selectedCommunityId && communities.length > 0) {
      setSelectorOpen(true);
    }

    if (
      selectedCommunityId &&
      !communities.some((community) => community.id === selectedCommunityId)
    ) {
      setSelectedCommunityId(null);
      setSelectedSpaceId(null);
      setCommunityDetail(null);
      router.replace("/comunidades");
      setSelectorOpen(true);
    }
  }, [communities, communitiesLoading, router, selectedCommunityId]);

  function navigateToCommunity(communityId: string) {
    setSelectedCommunityId(communityId);
    setSelectedSpaceId(null);
    setSelectorOpen(false);
    router.push(`/comunidades/${communityId}`);
  }

  function navigateToFeed() {
    if (!selectedCommunityId) return;
    setSelectedSpaceId(null);
    router.push(`/comunidades/${selectedCommunityId}`);
  }

  function navigateToSpace(spaceId: string) {
    if (!selectedCommunityId) return;
    setSelectedSpaceId(spaceId);
    router.push(`/comunidades/${selectedCommunityId}/espacos/${spaceId}`);
  }

  async function handleCreateCommunity(payload: CommunityPayload) {
    try {
      setSavingCommunity(true);

      const res = await fetch("/api/communities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await parseJson<{ item: CommunityItem }>(res);

      toast({
        title: "Comunidade criada",
        description: "A comunidade foi criada com sucesso.",
      });

      setCommunityDialogMode(null);
      await reloadCommunities();
      navigateToCommunity(result.item.id);
    } catch (error) {
      toast({
        title: "Erro ao criar comunidade",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a comunidade.",
        variant: "destructive",
      });
    } finally {
      setSavingCommunity(false);
    }
  }

  async function handleUpdateCommunity(payload: CommunityPayload) {
    if (!selectedCommunityId) return;

    try {
      setSavingCommunity(true);

      const res = await fetch(`/api/communities/${selectedCommunityId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await parseJson<{ item: CommunityDetail }>(res);

      toast({
        title: "Comunidade atualizada",
        description: "As configurações da comunidade foram salvas.",
      });

      setCommunityDialogMode(null);
      await Promise.all([
        reloadCommunities(),
        reloadCommunityDetail(selectedCommunityId),
      ]);
    } catch (error) {
      toast({
        title: "Erro ao atualizar comunidade",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar a comunidade.",
        variant: "destructive",
      });
    } finally {
      setSavingCommunity(false);
    }
  }

  async function handleDeleteCommunity() {
    if (!selectedCommunityId) return;

    try {
      setDeletingCommunity(true);

      const res = await fetch(`/api/communities/${selectedCommunityId}`, {
        method: "DELETE",
      });

      await parseJson<{ ok: true }>(res);

      toast({
        title: "Comunidade removida",
        description: "A comunidade foi removida com sucesso.",
      });

      setSelectedCommunityId(null);
      setSelectedSpaceId(null);
      setCommunityDetail(null);

      await reloadCommunities();
      router.push("/comunidades");
      setSelectorOpen(true);
      setConfirmDeleteCommunityOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao remover comunidade",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível remover a comunidade.",
        variant: "destructive",
      });
    } finally {
      setDeletingCommunity(false);
    }
  }

  async function handleCreateSpace(payload: SpacePayload) {
    if (!selectedCommunityId) return;

    try {
      setSavingSpace(true);

      const res = await fetch(`/api/communities/${selectedCommunityId}/spaces`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await parseJson<{ item: SpaceItem }>(res);

      toast({
        title: "Espaço criado",
        description: "O espaço foi criado com sucesso.",
      });

      setSpaceDialogMode(null);
      await Promise.all([
        reloadCommunities(),
        reloadCommunityDetail(selectedCommunityId),
      ]);
      navigateToSpace(result.item.id);
    } catch (error) {
      toast({
        title: "Erro ao criar espaço",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível criar o espaço.",
        variant: "destructive",
      });
    } finally {
      setSavingSpace(false);
    }
  }

  async function handleUpdateSpace(payload: SpacePayload) {
    if (!selectedCommunityId || !selectedSpaceId) return;

    try {
      setSavingSpace(true);

      const res = await fetch(
        `/api/communities/${selectedCommunityId}/spaces/${selectedSpaceId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      await parseJson<{ item: SpaceItem }>(res);

      toast({
        title: "Espaço atualizado",
        description: "O espaço foi atualizado com sucesso.",
      });

      setSpaceDialogMode(null);
      await Promise.all([
        reloadCommunities(),
        reloadCommunityDetail(selectedCommunityId),
      ]);
    } catch (error) {
      toast({
        title: "Erro ao atualizar espaço",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível atualizar o espaço.",
        variant: "destructive",
      });
    } finally {
      setSavingSpace(false);
    }
  }

  async function handleDeleteSpace() {
    if (!selectedCommunityId || !selectedSpaceId) return;

    try {
      setDeletingSpace(true);

      const res = await fetch(
        `/api/communities/${selectedCommunityId}/spaces/${selectedSpaceId}`,
        {
          method: "DELETE",
        }
      );

      await parseJson<{ ok: true }>(res);

      toast({
        title: "Espaço removido",
        description: "O espaço foi removido com sucesso.",
      });

      setSelectedSpaceId(null);
      await Promise.all([
        reloadCommunities(),
        reloadCommunityDetail(selectedCommunityId),
      ]);
      router.push(`/comunidades/${selectedCommunityId}`);
      setConfirmDeleteSpaceOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao remover espaço",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível remover o espaço.",
        variant: "destructive",
      });
    } finally {
      setDeletingSpace(false);
    }
  }

  const communityDialogInitialValue = useMemo<CommunityPayload | undefined>(() => {
    if (communityDialogMode !== "edit" || !communityDetail) return undefined;

    return {
      name: communityDetail.name,
      visibility: communityDetail.visibility,
      segmentType: communityDetail.segmentType,
      segmentTargetIds: communityDetail.segmentTargetIds,
      allowUnitMasterPost: communityDetail.allowUnitMasterPost,
      allowUnitUserPost: communityDetail.allowUnitUserPost,
    };
  }, [communityDetail, communityDialogMode]);

  const spaceDialogInitialValue = useMemo<SpacePayload | undefined>(() => {
    if (spaceDialogMode !== "edit" || !selectedSpace) return undefined;

    return {
      name: selectedSpace.name,
      spaceType: selectedSpace.spaceType,
    };
  }, [selectedSpace, spaceDialogMode]);

  return (
    <div className="space-y-4">
      <CommunitySelectionDialog
        open={selectorOpen}
        onOpenChange={(open) => {
          if (!selectedCommunityId && communities.length > 0 && !open) return;
          setSelectorOpen(open);
        }}
        communities={communities}
        loading={communitiesLoading}
        canManage={canManage}
        onSelect={navigateToCommunity}
        onCreate={() => setCommunityDialogMode("create")}
      />

      <CommunityFormDialog
        open={communityDialogMode !== null}
        mode={communityDialogMode ?? "create"}
        initialValue={communityDialogInitialValue}
        submitting={savingCommunity}
        onOpenChange={(open) => {
          if (!open) setCommunityDialogMode(null);
        }}
        onSubmit={(payload) => {
          if (communityDialogMode === "edit") {
            return handleUpdateCommunity(payload);
          }
          return handleCreateCommunity(payload);
        }}
      />

      <SpaceFormDialog
        open={spaceDialogMode !== null}
        mode={spaceDialogMode ?? "create"}
        initialValue={spaceDialogInitialValue}
        submitting={savingSpace}
        onOpenChange={(open) => {
          if (!open) setSpaceDialogMode(null);
        }}
        onSubmit={(payload) => {
          if (spaceDialogMode === "edit") {
            return handleUpdateSpace(payload);
          }
          return handleCreateSpace(payload);
        }}
      />

      <AlertDialog
        open={confirmDeleteCommunityOpen}
        onOpenChange={(open) => {
          setConfirmDeleteCommunityOpen(open);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover comunidade</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a comunidade e todos os espaços vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingCommunity}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteCommunity}
              disabled={deletingCommunity}>
              {deletingCommunity ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmDeleteSpaceOpen}
        onOpenChange={(open) => {
          setConfirmDeleteSpaceOpen(open);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover espaço</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o espaço selecionado da comunidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingSpace}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSpace}
              disabled={deletingSpace}>
              {deletingSpace ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!selectedCommunityId ? (
        <Card>
          <CardHeader>
            <h2>Comunidades</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione uma comunidade para acessar o feed consolidado e os espaços.
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setSelectorOpen(true)}
                disabled={communitiesLoading || communities.length === 0}>
                Selecionar comunidade
              </Button>
              {canManage ? (
                <Button
                  variant="outline"
                  onClick={() => setCommunityDialogMode("create")}>
                  <CirclePlus />
                  Nova comunidade
                </Button>
              ) : null}
            </div>
            {communitiesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : communities.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma comunidade cadastrada ainda.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border bg-white">
          <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-[280px_1fr]">
            <aside className="border-b p-4 lg:border-b-0 lg:border-r">
              {detailLoading || !communityDetail ? (
                <div className="space-y-3">
                  <Skeleton className="h-7 w-44" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2>{communityDetail.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Visibilidade: {communityDetail.visibility === "global" ? "Global" : "Segmentada"}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setSelectorOpen(true)}>
                    <Users />
                    Trocar comunidade
                  </Button>

                  <Separator />

                  <div className="space-y-2">
                    <Button
                      variant={selectedSpaceId ? "ghost" : "secondary"}
                      className="w-full justify-start"
                      onClick={navigateToFeed}>
                      <Rss />
                      Feed
                    </Button>

                    <ScrollArea className="h-64 rounded-md border p-2">
                      <div className="space-y-1">
                        {communityDetail.spaces.map((space) => (
                          <Button
                            key={space.id}
                            variant={selectedSpaceId === space.id ? "secondary" : "ghost"}
                            className="w-full justify-between"
                            onClick={() => navigateToSpace(space.id)}>
                            <span className="truncate">{space.name}</span>
                            <Badge variant="outline">
                              {space.spaceType === "eventos" ? "Eventos" : "Publicações"}
                            </Badge>
                          </Button>
                        ))}

                        {!communityDetail.spaces.length ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground">
                            Nenhum espaço criado nesta comunidade.
                          </p>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </div>

                  {canManage ? (
                    <Button
                      className="w-full"
                      onClick={() => setSpaceDialogMode("create")}>
                      <CirclePlus />
                      Criar espaço
                    </Button>
                  ) : null}
                </div>
              )}
            </aside>

            <section className="p-4">
              {detailLoading || !communityDetail ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-64" />
                  <Skeleton className="h-28 w-full" />
                  <Skeleton className="h-28 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <h2>
                        {selectedSpace
                          ? `Espaço: ${selectedSpace.name}`
                          : `Feed da comunidade: ${communityDetail.name}`}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedSpace
                          ? "Estrutura pronta para conteúdos de publicações e eventos."
                          : "Feed consolidado da comunidade (V1 estrutural)."}
                      </p>
                    </div>

                    {canManage ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setCommunityDialogMode("edit")}>
                          <Pencil />
                          Editar comunidade
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setConfirmDeleteCommunityOpen(true)}>
                          <Trash2 />
                          Remover comunidade
                        </Button>
                        {selectedSpace ? (
                          <>
                            <Button
                              variant="outline"
                              onClick={() => setSpaceDialogMode("edit")}>
                              <Pencil />
                              Editar espaço
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setConfirmDeleteSpaceOpen(true)}>
                              <Trash2 />
                              Remover espaço
                            </Button>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {selectedSpace ? (
                    <Card>
                      <CardHeader>
                        <h3>Detalhes do espaço</h3>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Tipo: {selectedSpace.spaceType === "eventos" ? "Eventos" : "Publicações"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Conteúdo fora de escopo na V1. O espaço já está pronto para navegação,
                          permissões e integração futura.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      <Card>
                        <CardHeader>
                          <h3>Resumo de espaços visíveis</h3>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex flex-wrap gap-2">
                            {communityDetail.spaces.map((space) => (
                              <Badge
                                key={space.id}
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => navigateToSpace(space.id)}>
                                <Layers3 className="mr-1 h-3.5 w-3.5" />
                                {space.name}
                              </Badge>
                            ))}
                          </div>
                          {!communityDetail.spaces.length ? (
                            <p className="text-sm text-muted-foreground">
                              Esta comunidade ainda não possui espaços.
                            </p>
                          ) : null}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <h3>Feed consolidado</h3>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground">
                            O feed consolidado está preparado para receber itens de espaços visíveis
                            ao usuário. Na V1, somente a estrutura de navegação e permissões é
                            exibida.
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

type CommunitySelectionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  communities: CommunityItem[];
  loading: boolean;
  canManage: boolean;
  onSelect: (communityId: string) => void;
  onCreate: () => void;
};

function CommunitySelectionDialog({
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
                    <span className="block text-sm font-medium">{community.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {community.visibility === "global" ? "Global" : "Segmentada"}
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

type CommunityFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: CommunityPayload;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CommunityPayload) => Promise<void>;
};

function CommunityFormDialog({
  open,
  mode,
  initialValue,
  submitting,
  onOpenChange,
  onSubmit,
}: CommunityFormDialogProps) {
  const { toast } = useToast();
  const [value, setValue] = useState<CommunityPayload>(DEFAULT_COMMUNITY_FORM);
  const [segmentOptions, setSegmentOptions] = useState<SegmentOption[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue ?? DEFAULT_COMMUNITY_FORM);
  }, [initialValue, open]);

  const loadSegmentOptions = useCallback(async (segmentType: SegmentType) => {
    try {
      setSegmentLoading(true);
      const endpoint =
        segmentType === "group"
          ? "/api/comunicados/recipients/groups?limit=100"
          : "/api/comunicados/recipients/teams?limit=100";

      const payload = await parseJson<{ items: any[] }>(
        await fetch(endpoint, { cache: "no-store" })
      );

      setSegmentOptions(
        payload.items.map((item) => ({
          id: item.id as string,
          name: item.name as string,
          membersCount: item.membersCount as number | undefined,
        }))
      );
    } catch (error) {
      setSegmentOptions([]);
      toast({
        title: "Erro ao carregar segmentação",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar as opções de segmentação.",
        variant: "destructive",
      });
    } finally {
      setSegmentLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    if (value.visibility !== "segmented") {
      setSegmentOptions([]);
      return;
    }

    if (!value.segmentType) {
      setSegmentOptions([]);
      return;
    }

    loadSegmentOptions(value.segmentType);
  }, [loadSegmentOptions, open, value.segmentType, value.visibility]);

  function toggleSegmentTarget(targetId: string) {
    setValue((current) => {
      const nextTargets = current.segmentTargetIds.includes(targetId)
        ? current.segmentTargetIds.filter((id) => id !== targetId)
        : [...current.segmentTargetIds, targetId];

      return {
        ...current,
        segmentTargetIds: nextTargets,
      };
    });
  }

  async function submit() {
    if (!value.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para a comunidade.",
        variant: "destructive",
      });
      return;
    }

    if (value.visibility === "segmented") {
      if (!value.segmentType) {
        toast({
          title: "Segmentação incompleta",
          description: "Selecione tipo de segmentação para continuar.",
          variant: "destructive",
        });
        return;
      }

      if (!value.segmentTargetIds.length) {
        toast({
          title: "Segmentação incompleta",
          description: "Selecione ao menos um alvo de segmentação.",
          variant: "destructive",
        });
        return;
      }
    }

    await onSubmit({
      ...value,
      name: value.name.trim(),
      segmentType: value.visibility === "segmented" ? value.segmentType : null,
      segmentTargetIds:
        value.visibility === "segmented" ? value.segmentTargetIds : [],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova comunidade" : "Editar comunidade"}
          </DialogTitle>
          <DialogDescription>
            Configure visibilidade, segmentação e permissões de postagem da comunidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="community-name">Nome</Label>
            <Input
              id="community-name"
              value={value.name}
              onChange={(event) =>
                setValue((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ex.: Comunicados da matriz"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-visibility">Visibilidade</Label>
            <Select
              value={value.visibility}
              onValueChange={(visibility: CommunityVisibility) => {
                setValue((current) => ({
                  ...current,
                  visibility,
                  segmentType: visibility === "segmented" ? current.segmentType : null,
                  segmentTargetIds:
                    visibility === "segmented" ? current.segmentTargetIds : [],
                }));
              }}>
              <SelectTrigger id="community-visibility">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="segmented">Segmentada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.visibility === "segmented" ? (
            <div className="space-y-4 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="community-segment-type">Segmentar por</Label>
                <Select
                  value={value.segmentType ?? undefined}
                  onValueChange={(segmentType: SegmentType) => {
                    setValue((current) => ({
                      ...current,
                      segmentType,
                      segmentTargetIds: [],
                    }));
                  }}>
                  <SelectTrigger id="community-segment-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Grupo</SelectItem>
                    <SelectItem value="team">Equipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {value.segmentType ? (
                <div className="space-y-2">
                  <Label>Alvos da segmentação</Label>
                  {segmentLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    <ScrollArea className="h-40 rounded-md border p-2">
                      <div className="space-y-2">
                        {segmentOptions.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center justify-between gap-2 rounded-md border px-2 py-2">
                            <span className="flex items-center gap-2">
                              <Checkbox
                                checked={value.segmentTargetIds.includes(option.id)}
                                onCheckedChange={() => toggleSegmentTarget(option.id)}
                              />
                              <span className="text-sm">{option.name}</span>
                            </span>
                            {typeof option.membersCount === "number" ? (
                              <Badge variant="outline">{option.membersCount}</Badge>
                            ) : null}
                          </label>
                        ))}

                        {!segmentOptions.length ? (
                          <p className="px-1 text-sm text-muted-foreground">
                            Nenhum alvo disponível para este tipo de segmentação.
                          </p>
                        ) : null}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3">
              <span className="space-y-1">
                <span className="block text-sm font-medium">Permitir postagem de unit_master</span>
                <span className="block text-sm text-muted-foreground">
                  Quando ativo, usuários unit_master podem publicar nesta comunidade.
                </span>
              </span>
              <Switch
                checked={value.allowUnitMasterPost}
                onCheckedChange={(checked) =>
                  setValue((current) => ({ ...current, allowUnitMasterPost: checked }))
                }
              />
            </label>

            <label className="flex items-center justify-between gap-3">
              <span className="space-y-1">
                <span className="block text-sm font-medium">Permitir postagem de unit_user</span>
                <span className="block text-sm text-muted-foreground">
                  Quando ativo, usuários unit_user podem publicar nesta comunidade.
                </span>
              </span>
              <Switch
                checked={value.allowUnitUserPost}
                onCheckedChange={(checked) =>
                  setValue((current) => ({ ...current, allowUnitUserPost: checked }))
                }
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting
              ? mode === "create"
                ? "Criando..."
                : "Salvando..."
              : mode === "create"
              ? "Criar comunidade"
              : "Salvar mudanças"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type SpaceFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: SpacePayload;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SpacePayload) => Promise<void>;
};

function SpaceFormDialog({
  open,
  mode,
  initialValue,
  submitting,
  onOpenChange,
  onSubmit,
}: SpaceFormDialogProps) {
  const { toast } = useToast();
  const [value, setValue] = useState<SpacePayload>(DEFAULT_SPACE_FORM);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue ?? DEFAULT_SPACE_FORM);
  }, [initialValue, open]);

  async function submit() {
    if (!value.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para o espaço.",
        variant: "destructive",
      });
      return;
    }

    await onSubmit({
      name: value.name.trim(),
      spaceType: value.spaceType,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Novo espaço" : "Editar espaço"}</DialogTitle>
          <DialogDescription>
            Defina o nome e o tipo de espaço para organizar o conteúdo da comunidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space-name">Nome</Label>
            <Input
              id="space-name"
              value={value.name}
              onChange={(event) =>
                setValue((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Ex.: Eventos internos"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="space-type">Tipo</Label>
            <Select
              value={value.spaceType}
              onValueChange={(spaceType: SpaceType) =>
                setValue((current) => ({ ...current, spaceType }))
              }>
              <SelectTrigger id="space-type">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="publicacoes">Publicações</SelectItem>
                <SelectItem value="eventos">Eventos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting
              ? mode === "create"
                ? "Criando..."
                : "Salvando..."
              : mode === "create"
              ? "Criar espaço"
              : "Salvar mudanças"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
