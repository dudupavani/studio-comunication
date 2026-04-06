"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { useToast } from "@/hooks/use-toast";
import type { ReactionActor } from "@/lib/reactions/core";
import { parseJson } from "./publication-composer-utils";
import type {
  CommunityFeed,
  CommunityFeedItem,
  CommunityDetail,
  CommunityItem,
  CommunityPayload,
  SpaceItem,
  SpacePayload,
} from "./types";

type UseCommunitiesDataParams = {
  initialCommunityId?: string;
  initialSpaceId?: string;
};

export function useCommunitiesData({
  initialCommunityId,
  initialSpaceId,
}: UseCommunitiesDataParams) {
  const router = useRouter();
  const { toast } = useToast();

  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(
    initialCommunityId ?? null,
  );
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(
    initialSpaceId ?? null,
  );
  const [communityDetail, setCommunityDetail] =
    useState<CommunityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [communityFeed, setCommunityFeed] = useState<CommunityFeed | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(!initialCommunityId);

  const [communityDialogMode, setCommunityDialogMode] = useState<
    "create" | "edit" | null
  >(null);
  const [spaceDialogMode, setSpaceDialogMode] = useState<
    "create" | "edit" | null
  >(null);

  const [savingCommunity, setSavingCommunity] = useState(false);
  const [savingSpace, setSavingSpace] = useState(false);

  const [confirmDeleteCommunityOpen, setConfirmDeleteCommunityOpen] =
    useState(false);
  const [confirmDeleteSpaceOpen, setConfirmDeleteSpaceOpen] = useState(false);

  const [deletingCommunity, setDeletingCommunity] = useState(false);
  const [deletingSpace, setDeletingSpace] = useState(false);
  const [deletingPublicationId, setDeletingPublicationId] = useState<string | null>(
    null,
  );
  const [reactingPublicationId, setReactingPublicationId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSelectedCommunityId(initialCommunityId ?? null);
    setSelectedSpaceId(initialSpaceId ?? null);
    setSelectorOpen(!initialCommunityId);
  }, [initialCommunityId, initialSpaceId]);

  const selectedSpace = useMemo(() => {
    if (!communityDetail || !selectedSpaceId) return null;
    return (
      communityDetail.spaces.find((space) => space.id === selectedSpaceId) ??
      null
    );
  }, [communityDetail, selectedSpaceId]);

  const reloadCommunities = useCallback(async () => {
    try {
      setCommunitiesLoading(true);
      const payload = await parseJson<{ items: CommunityItem[] }>(
        await fetch("/api/communities", { cache: "no-store" }),
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
          await fetch(`/api/communities/${communityId}`, { cache: "no-store" }),
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
    [router, selectedSpaceId, toast],
  );

  const reloadCommunityFeed = useCallback(
    async (communityId: string) => {
      try {
        setFeedLoading(true);
        const payload = await parseJson<{ item: CommunityFeed }>(
          await fetch(`/api/communities/${communityId}/feed`, {
            cache: "no-store",
          }),
        );
        setCommunityFeed(payload.item);
      } catch (error) {
        setCommunityFeed(null);
        toast({
          title: "Falha ao carregar feed da comunidade",
          description:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o feed consolidado.",
          variant: "destructive",
        });
      } finally {
        setFeedLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    reloadCommunities();
  }, [reloadCommunities]);

  useEffect(() => {
    if (!selectedCommunityId) {
      setCommunityDetail(null);
      setCommunityFeed(null);
      return;
    }
    void Promise.all([
      reloadCommunityDetail(selectedCommunityId),
      reloadCommunityFeed(selectedCommunityId),
    ]);
  }, [reloadCommunityDetail, reloadCommunityFeed, selectedCommunityId]);

  const navigateToCommunity = useCallback(
    (communityId: string, options?: { replace?: boolean }) => {
      setSelectedCommunityId(communityId);
      setSelectedSpaceId(null);
      setSelectorOpen(false);

      if (options?.replace) {
        router.replace(`/comunidades/${communityId}`);
        return;
      }
      router.push(`/comunidades/${communityId}`);
    },
    [router],
  );

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

  const activeCommunity = useMemo(() => {
    if (communityDetail) return communityDetail;
    if (!selectedCommunityId) return null;
    return (
      communities.find((community) => community.id === selectedCommunityId) ??
      null
    );
  }, [communities, communityDetail, selectedCommunityId]);

  useEffect(() => {
    if (communitiesLoading) return;

    if (!selectedCommunityId && communities.length > 0 && !initialCommunityId) {
      navigateToCommunity(communities[0].id, { replace: true });
      return;
    }

    if (
      selectedCommunityId &&
      !communities.some((community) => community.id === selectedCommunityId)
    ) {
      setSelectedCommunityId(null);
      setSelectedSpaceId(null);
      setCommunityDetail(null);
      setCommunityFeed(null);
      router.replace("/comunidades");
      setSelectorOpen(true);
    }
  }, [
    communities,
    communitiesLoading,
    initialCommunityId,
    navigateToCommunity,
    router,
    selectedCommunityId,
  ]);

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
        reloadCommunityFeed(selectedCommunityId),
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
      setCommunityFeed(null);
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
        reloadCommunityFeed(selectedCommunityId),
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
        },
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
        reloadCommunityFeed(selectedCommunityId),
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
        { method: "DELETE" },
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
        reloadCommunityFeed(selectedCommunityId),
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

  async function handleDeletePublication(item: CommunityFeedItem) {
    try {
      setDeletingPublicationId(item.id);
      const res = await fetch(
        `/api/communities/${item.communityId}/spaces/${item.spaceId}/posts/${item.id}`,
        { method: "DELETE" },
      );
      await parseJson<{ ok: true }>(res);

      toast({
        title: "Publicação removida",
        description: "A publicação foi removida com sucesso.",
      });

      await reloadCommunityFeed(item.communityId);
      return true;
    } catch (error) {
      toast({
        title: "Erro ao remover publicação",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível remover a publicação.",
        variant: "destructive",
      });
      return false;
    } finally {
      setDeletingPublicationId(null);
    }
  }

  async function handleTogglePublicationReaction(
    item: CommunityFeedItem,
    emoji: "👍" = "👍",
  ) {
    try {
      setReactingPublicationId(item.id);
      const res = await fetch(
        `/api/communities/${item.communityId}/spaces/${item.spaceId}/posts/${item.id}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        },
      );
      await parseJson<{ ok: true; removed: boolean }>(res);
      await reloadCommunityFeed(item.communityId);
      return true;
    } catch (error) {
      toast({
        title: "Erro ao reagir",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível registrar sua reação.",
        variant: "destructive",
      });
      return false;
    } finally {
      setReactingPublicationId(null);
    }
  }

  async function loadPublicationReactionActors(
    item: CommunityFeedItem,
    emoji: "👍" = "👍",
  ) {
    try {
      const res = await fetch(
        `/api/communities/${item.communityId}/spaces/${item.spaceId}/posts/${item.id}/reactions?emoji=${encodeURIComponent(emoji)}`,
        { cache: "no-store" },
      );
      const payload = await parseJson<{
        item: {
          emoji: "👍";
          count: number;
          actors: ReactionActor[];
        };
      }>(res);
      return payload.item.actors;
    } catch (error) {
      toast({
        title: "Erro ao carregar curtidas",
        description:
          error instanceof Error
            ? error.message
            : "Não foi possível carregar a lista de curtidas.",
        variant: "destructive",
      });
      return [];
    }
  }

  const communityDialogInitialValue = useMemo<
    CommunityPayload | undefined
  >(() => {
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

  return {
    communities,
    communitiesLoading,
    reloadCommunityFeed,
    selectedCommunityId,
    selectedSpaceId,
    communityDetail,
    detailLoading,
    communityFeed,
    feedLoading,
    selectorOpen,
    setSelectorOpen,
    communityDialogMode,
    setCommunityDialogMode,
    spaceDialogMode,
    setSpaceDialogMode,
    savingCommunity,
    savingSpace,
    confirmDeleteCommunityOpen,
    setConfirmDeleteCommunityOpen,
    confirmDeleteSpaceOpen,
    setConfirmDeleteSpaceOpen,
    deletingCommunity,
    deletingSpace,
    deletingPublicationId,
    reactingPublicationId,
    selectedSpace,
    activeCommunity,
    navigateToCommunity,
    navigateToFeed,
    navigateToSpace,
    handleCreateCommunity,
    handleUpdateCommunity,
    handleDeleteCommunity,
    handleCreateSpace,
    handleUpdateSpace,
    handleDeleteSpace,
    handleDeletePublication,
    handleTogglePublicationReaction,
    loadPublicationReactionActors,
    communityDialogInitialValue,
    spaceDialogInitialValue,
  };
}
