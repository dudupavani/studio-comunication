import { notFound } from "next/navigation";

import { getAuthContext } from "@/lib/auth-context";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export function resolveManagePermission(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
) {
  return (
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    auth.orgRole === "org_master"
  );
}

export function resolveCreateCommunityPermission(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
) {
  return (
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    auth.orgRole === "org_master"
  );
}

export async function loadCommunitiesPageContext() {
  const auth = await getAuthContext();
  if (!auth) {
    notFound();
  }

  const supabase = await createClient();
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url")
    .eq("id", auth.userId)
    .maybeSingle();

  const userProfile: Profile = {
    id: auth.userId,
    email: auth.user?.email ?? "",
    full_name:
      profileData?.full_name ?? auth.user?.user_metadata?.name ?? "Usuário",
    global_role: auth.platformRole,
    created_at: auth.user?.created_at ?? new Date().toISOString(),
    phone: profileData?.phone ?? "",
    avatar_url:
      profileData?.avatar_url ?? auth.user?.user_metadata?.avatar_url ?? "",
  };

  return {
    auth,
    canManage: resolveManagePermission(auth),
    canCreateCommunity: resolveCreateCommunityPermission(auth),
    userProfile,
  };
}
