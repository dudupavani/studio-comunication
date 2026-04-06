"use client";

import { useEffect, useState } from "react";

import { CommunityContentPane } from "./community-content-pane";
import { CommunityCreateWizard } from "./community-create-wizard";
import { CommunityFormDialog } from "./community-form-dialog";
import { CommunitySelectionDialog } from "./community-selection-dialog";
import { CommunitySidebar } from "./community-sidebar";
import { CommunityWorkspaceHeader } from "./community-workspace-header";
import { DestructiveConfirmationDialog } from "./destructive-confirmation-dialog";
import { PublicationComposerModal } from "./publication-composer-modal";
import { SpaceFormDialog } from "./space-form-dialog";
import type { CommunitiesModuleProps } from "./types";
import { useCommunitiesData } from "./use-communities-data";
import { usePublicationComposer } from "./use-publication-composer";

export default function CommunitiesModule({
  canManage,
  canCreateCommunity: _canCreateCommunity,
  user,
  initialCommunityId,
  initialSpaceId,
}: CommunitiesModuleProps) {
  const communitiesData = useCommunitiesData({
    initialCommunityId,
    initialSpaceId,
  });

  const [createWizardOpen, setCreateWizardOpen] = useState(false);

  useEffect(() => {
    if (
      !communitiesData.communitiesLoading &&
      communitiesData.communities.length === 0 &&
      canManage
    ) {
      setCreateWizardOpen(true);
    }
  }, [canManage, communitiesData.communitiesLoading, communitiesData.communities.length]);

  const visibleFeedItems =
    communitiesData.selectedSpace &&
    communitiesData.selectedSpace.spaceType === "publicacoes"
      ? (communitiesData.communityFeed?.items ?? []).filter(
          (item) => item.spaceId === communitiesData.selectedSpaceId,
        )
      : (communitiesData.communityFeed?.items ?? []);

  const composer = usePublicationComposer({
    selectedCommunityId: communitiesData.selectedCommunityId,
    selectedSpaceId: communitiesData.selectedSpaceId,
    onPublished: () => {
      if (communitiesData.selectedCommunityId) {
        void communitiesData.reloadCommunityFeed(communitiesData.selectedCommunityId);
      }
    },
  });

  async function handleWizardCreate(payload: Parameters<typeof communitiesData.handleCreateCommunity>[0]) {
    await communitiesData.handleCreateCommunity(payload);
    setCreateWizardOpen(false);
  }

  if (createWizardOpen) {
    return (
      <CommunityCreateWizard
        submitting={communitiesData.savingCommunity}
        onSubmit={handleWizardCreate}
        onCancel={() => setCreateWizardOpen(false)}
      />
    );
  }

  return (
    <>
      <CommunitySelectionDialog
        open={
          communitiesData.selectorOpen && communitiesData.communities.length > 0
        }
        onOpenChange={(open) => {
          if (
            !communitiesData.selectedCommunityId &&
            communitiesData.communities.length > 0 &&
            !open
          ) {
            return;
          }
          communitiesData.setSelectorOpen(open);
        }}
        communities={communitiesData.communities}
        loading={communitiesData.communitiesLoading}
        canManage={canManage}
        onSelect={communitiesData.navigateToCommunity}
        onCreate={() => {
          communitiesData.setSelectorOpen(false);
          setCreateWizardOpen(true);
        }}
      />

      <CommunityFormDialog
        open={communitiesData.communityDialogMode !== null}
        mode={communitiesData.communityDialogMode ?? "create"}
        initialValue={communitiesData.communityDialogInitialValue}
        submitting={communitiesData.savingCommunity}
        onOpenChange={(open) => {
          if (!open) {
            communitiesData.setCommunityDialogMode(null);
          }
        }}
        onSubmit={(payload) => {
          if (communitiesData.communityDialogMode === "edit") {
            return communitiesData.handleUpdateCommunity(payload);
          }
          return communitiesData.handleCreateCommunity(payload);
        }}
      />

      <SpaceFormDialog
        open={communitiesData.spaceDialogMode !== null}
        mode={communitiesData.spaceDialogMode ?? "create"}
        initialValue={communitiesData.spaceDialogInitialValue}
        submitting={communitiesData.savingSpace}
        onOpenChange={(open) => {
          if (!open) {
            communitiesData.setSpaceDialogMode(null);
          }
        }}
        onSubmit={(payload) => {
          if (communitiesData.spaceDialogMode === "edit") {
            return communitiesData.handleUpdateSpace(payload);
          }
          return communitiesData.handleCreateSpace(payload);
        }}
      />

      <PublicationComposerModal
        composer={composer}
        canManage={canManage}
        currentUserId={user.id}
        onDeletePublication={communitiesData.handleDeletePublication}
        onToggleReaction={communitiesData.handleTogglePublicationReaction}
        onLoadReactionActors={communitiesData.loadPublicationReactionActors}
        reactingPublicationId={communitiesData.reactingPublicationId}
        deletingPublicationId={communitiesData.deletingPublicationId}
      />

      <DestructiveConfirmationDialog
        open={communitiesData.confirmDeleteCommunityOpen}
        onOpenChange={communitiesData.setConfirmDeleteCommunityOpen}
        title="Remover comunidade"
        description="Esta ação remove a comunidade e todos os espaços vinculados."
        confirmLabel="Remover"
        pendingLabel="Removendo..."
        pending={communitiesData.deletingCommunity}
        onConfirm={communitiesData.handleDeleteCommunity}
      />

      <DestructiveConfirmationDialog
        open={communitiesData.confirmDeleteSpaceOpen}
        onOpenChange={communitiesData.setConfirmDeleteSpaceOpen}
        title="Remover espaço"
        description="Esta ação remove o espaço selecionado da comunidade."
        confirmLabel="Remover"
        pendingLabel="Removendo..."
        pending={communitiesData.deletingSpace}
        onConfirm={communitiesData.handleDeleteSpace}
      />

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col bg-background">
        <CommunityWorkspaceHeader
          activeCommunity={communitiesData.activeCommunity}
          isFeedView={!communitiesData.selectedSpaceId}
          onOpenSelector={() => communitiesData.setSelectorOpen(true)}
          onNavigateToFeed={communitiesData.navigateToFeed}
          user={user}
        />

        <div className="flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[216px_minmax(0,1fr)]">
          <CommunitySidebar
            activeCommunity={communitiesData.activeCommunity}
            selectedCommunityId={communitiesData.selectedCommunityId}
            selectedSpaceId={communitiesData.selectedSpaceId}
            detailLoading={communitiesData.detailLoading}
            communityDetail={communitiesData.communityDetail}
            canManage={canManage}
            onNavigateToFeed={communitiesData.navigateToFeed}
            onNavigateToSpace={communitiesData.navigateToSpace}
            onOpenCreateSpace={() =>
              communitiesData.setSpaceDialogMode("create")
            }
          />

          <CommunityContentPane
            detailLoading={communitiesData.detailLoading}
            feedLoading={communitiesData.feedLoading}
            communityDetail={communitiesData.communityDetail}
            feedItems={visibleFeedItems}
            selectedSpace={communitiesData.selectedSpace}
            canManage={canManage}
            selectedCommunityId={communitiesData.selectedCommunityId}
            currentUserId={user.id}
            communitiesCount={communitiesData.communities.length}
            onOpenSelector={() => communitiesData.setSelectorOpen(true)}
            onEditCommunity={() =>
              communitiesData.setCommunityDialogMode("edit")
            }
            onDeleteCommunity={() =>
              communitiesData.setConfirmDeleteCommunityOpen(true)
            }
            onEditSpace={() => communitiesData.setSpaceDialogMode("edit")}
            onDeleteSpace={() =>
              communitiesData.setConfirmDeleteSpaceOpen(true)
            }
            onCreateSpace={() => communitiesData.setSpaceDialogMode("create")}
            onNavigateToSpace={communitiesData.navigateToSpace}
            onOpenCreatePublication={composer.openCreatePublication}
            onViewPublication={composer.openViewPublication}
            onEditPublication={composer.openEditPublication}
            onDeletePublication={communitiesData.handleDeletePublication}
            onToggleReaction={communitiesData.handleTogglePublicationReaction}
            onLoadReactionActors={communitiesData.loadPublicationReactionActors}
            reactingPublicationId={communitiesData.reactingPublicationId}
            deletingPublicationId={communitiesData.deletingPublicationId}
          />
        </div>
      </div>
    </>
  );
}
