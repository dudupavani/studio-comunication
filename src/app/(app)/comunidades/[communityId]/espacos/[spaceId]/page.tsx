import { notFound } from "next/navigation";
import CommunitiesModule from "../../../components/communities-module";
import { loadCommunitiesPageContext } from "../../../page-helpers";

export const dynamic = "force-dynamic";

export default async function ComunidadeSpacePage({
  params,
}: {
  params: Promise<{ communityId: string; spaceId: string }>;
}) {
  const context = await loadCommunitiesPageContext();
  if (!context) {
    return notFound();
  }

  const { communityId, spaceId } = await params;

  return (
    <div className="h-full">
      <CommunitiesModule
        canManage={context.canManage}
        canCreateCommunity={context.canCreateCommunity}
        user={context.userProfile}
        initialCommunityId={communityId}
        initialSpaceId={spaceId}
      />
    </div>
  );
}
