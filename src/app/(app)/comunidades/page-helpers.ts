import { notFound } from "next/navigation";

import { getAuthContext } from "@/lib/auth-context";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { canUsePermission } from "@/lib/permissions/user-functions";

export async function resolveManagePermission(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
) {
  if (auth.platformRole === "platform_admin" || auth.orgRole === "org_admin") {
    return true;
  }
  if (auth.orgRole === "org_master") {
    return canUsePermission(auth, "manage_communities");
  }
  return false;
}

export async function resolveCreateCommunityPermission(
  auth: NonNullable<Awaited<ReturnType<typeof getAuthContext>>>,
) {
  return resolveManagePermission(auth);
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
    canManage: await resolveManagePermission(auth),
    canCreateCommunity: await resolveCreateCommunityPermission(auth),
    userProfile,
  };
}
