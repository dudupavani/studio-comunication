import { notFound } from "next/navigation";
import CommunitiesModule from "./components/communities-module";
import { loadCommunitiesPageContext } from "./page-helpers";

export const dynamic = "force-dynamic";

export default async function ComunidadesPage() {
  const context = await loadCommunitiesPageContext();
  if (!context) {
    return notFound();
  }

  return (
    <div className="h-full">
      <CommunitiesModule
        canManage={context.canManage}
        canCreateCommunity={context.canCreateCommunity}
        user={context.userProfile}
      />
    </div>
  );
}
