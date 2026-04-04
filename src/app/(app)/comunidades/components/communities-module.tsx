"use client";

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
import CommunitiesOnboarding from "./communities-onboarding";
import { CommunityContentPane } from "./community-content-pane";
import { CommunityFormDialog } from "./community-form-dialog";
import { CommunitySelectionDialog } from "./community-selection-dialog";
import { CommunitySidebar } from "./community-sidebar";
import { CommunitySwitcherRail } from "./community-switcher-rail";
import { PublicationComposerModal } from "./publication-composer-modal";
import { SpaceFormDialog } from "./space-form-dialog";
import type { CommunitiesModuleProps } from "./types";
import { useCommunitiesData } from "./use-communities-data";
import { usePublicationComposer } from "./use-publication-composer";

export default function CommunitiesModule({
  canManage,
  initialCommunityId,
  initialSpaceId,
}: CommunitiesModuleProps) {
  const communitiesData = useCommunitiesData({
    initialCommunityId,
    initialSpaceId,
  });

  const composer = usePublicationComposer({
    selectedCommunityId: communitiesData.selectedCommunityId,
    selectedSpaceId: communitiesData.selectedSpaceId,
  });

  return (
    <div className="space-y-4">
      <CommunitySelectionDialog
        open={communitiesData.selectorOpen}
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
        onCreate={() => communitiesData.setCommunityDialogMode("create")}
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

      <PublicationComposerModal composer={composer} />

      <AlertDialog
        open={communitiesData.confirmDeleteCommunityOpen}
        onOpenChange={communitiesData.setConfirmDeleteCommunityOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover comunidade</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a comunidade e todos os espaços vinculados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={communitiesData.deletingCommunity}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={communitiesData.handleDeleteCommunity}
              disabled={communitiesData.deletingCommunity}>
              {communitiesData.deletingCommunity ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={communitiesData.confirmDeleteSpaceOpen}
        onOpenChange={communitiesData.setConfirmDeleteSpaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover espaço</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove o espaço selecionado da comunidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={communitiesData.deletingSpace}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={communitiesData.handleDeleteSpace}
              disabled={communitiesData.deletingSpace}>
              {communitiesData.deletingSpace ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {communitiesData.communities.length === 0 &&
      !communitiesData.communitiesLoading ? (
        <CommunitiesOnboarding
          canManage={canManage}
          onOpenCreateDialog={() => communitiesData.setCommunityDialogMode("create")}
        />
      ) : (
        <div className="overflow-hidden">
          <div className="grid min-h-[calc(100vh-8rem)] grid-cols-1 lg:grid-cols-[80px_330px_minmax(0,1fr)]">
            <CommunitySwitcherRail
              communities={communitiesData.communities}
              communitiesLoading={communitiesData.communitiesLoading}
              selectedCommunityId={communitiesData.selectedCommunityId}
              canManage={canManage}
              onSelectCommunity={communitiesData.navigateToCommunity}
              onCreateCommunity={() =>
                communitiesData.setCommunityDialogMode("create")
              }
            />

            <CommunitySidebar
              activeCommunity={communitiesData.activeCommunity}
              selectedCommunityId={communitiesData.selectedCommunityId}
              selectedSpaceId={communitiesData.selectedSpaceId}
              detailLoading={communitiesData.detailLoading}
              communityDetail={communitiesData.communityDetail}
              canManage={canManage}
              onNavigateToFeed={communitiesData.navigateToFeed}
              onNavigateToSpace={communitiesData.navigateToSpace}
              onOpenCreateSpace={() => communitiesData.setSpaceDialogMode("create")}
            />

            <CommunityContentPane
              detailLoading={communitiesData.detailLoading}
              communityDetail={communitiesData.communityDetail}
              selectedSpace={communitiesData.selectedSpace}
              canManage={canManage}
              selectedCommunityId={communitiesData.selectedCommunityId}
              communitiesCount={communitiesData.communities.length}
              onOpenSelector={() => communitiesData.setSelectorOpen(true)}
              onEditCommunity={() => communitiesData.setCommunityDialogMode("edit")}
              onDeleteCommunity={() =>
                communitiesData.setConfirmDeleteCommunityOpen(true)
              }
              onEditSpace={() => communitiesData.setSpaceDialogMode("edit")}
              onDeleteSpace={() => communitiesData.setConfirmDeleteSpaceOpen(true)}
              onCreateSpace={() => communitiesData.setSpaceDialogMode("create")}
              onOpenCreatePublication={() => composer.setCreatePublicationOpen(true)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
