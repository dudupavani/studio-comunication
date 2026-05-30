import { revalidatePath } from "next/cache";
import { getAuthContext, type AuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { createServiceClient } from "@/lib/supabase/service";
import { PLATFORM_ADMIN } from "@/lib/types/roles";

type RemoveUserFromCurrentOrgResult =
  | { ok: true; removed: true }
  | { ok: false; status: number; error: string };

export async function removeUserFromCurrentOrg(
  userId: string,
  authContext?: AuthContext | null
): Promise<RemoveUserFromCurrentOrgResult> {
  const auth = authContext ?? (await getAuthContext());
  if (!auth) {
    return { ok: false, status: 401, error: "Nao autenticado." };
  }
  if (!(await canManageUsers(auth))) {
    return { ok: false, status: 403, error: "Sem permissao para remover usuario." };
  }
  if (!auth.orgId) {
    return { ok: false, status: 400, error: "Organizacao ativa nao encontrada." };
  }
  if (auth.userId === userId) {
    return {
      ok: false,
      status: 400,
      error: "Voce nao pode remover a si mesmo da organizacao.",
    };
  }

  const svc = createServiceClient();

  const { data: profile, error: profileError } = await svc
    .from("profiles")
    .select("global_role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, status: 500, error: "Erro ao validar usuario." };
  }
  if (profile?.global_role === PLATFORM_ADMIN) {
    return {
      ok: false,
      status: 403,
      error: "Nao e permitido remover platform_admin por esta interface.",
    };
  }

  const { data: membership, error: membershipError } = await svc
    .from("org_members")
    .select("org_id, role")
    .eq("org_id", auth.orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) {
    return { ok: false, status: 500, error: "Erro ao validar organizacao do usuario." };
  }
  if (!membership) {
    return { ok: false, status: 404, error: "Usuario nao pertence a organizacao ativa." };
  }
  if (
    auth.platformRole !== PLATFORM_ADMIN &&
    auth.orgRole === "org_master" &&
    membership.role === "org_admin"
  ) {
    return { ok: false, status: 403, error: "Org master nao pode remover org_admin." };
  }

  const { error: rpcError } = await svc.rpc("remove_user_from_org", {
    p_user_id: userId,
    p_org_id: auth.orgId,
  });

  if (rpcError) {
    return { ok: false, status: 500, error: "Erro ao remover vinculos do usuario." };
  }

  revalidatePath("/users");
  revalidatePath(`/users/${userId}/edit`);
  return { ok: true, removed: true };
}
