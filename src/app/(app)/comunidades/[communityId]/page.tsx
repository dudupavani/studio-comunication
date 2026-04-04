import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import CommunitiesModule from "../components/communities-module";

export const dynamic = "force-dynamic";

function resolveManagePermission(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
) {
  return (
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    auth.orgRole === "org_master"
  );
}

export default async function ComunidadeDetailPage({
  params,
}: {
  params: Promise<{ communityId: string }>;
}) {
  const auth = await getAuthContext();
  if (!auth) {
    return notFound();
  }

  const canManage = resolveManagePermission(auth);
  const { communityId } = await params;

  return (
    <div className="h-full">
      <CommunitiesModule
        canManage={canManage}
        initialCommunityId={communityId}
      />
    </div>
  );
}
