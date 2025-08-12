import { createClient } from "@/lib/supabase/server";

/** Roles conforme nosso modelo */
export type PlatformRole = "platform_admin" | null;
export type OrgRole = "org_admin" | "unit_master" | "unit_user" | null;

/** Retrato do usuário logado que o frontend/servidor vai consumir */
export type AuthContext = {
  userId: string;
  platformRole: PlatformRole; // vem de profiles.global_role
  orgRole: OrgRole; // vem de org_members.role
  orgId: string | null; // org do usuário (um usuário pertence a 1 org)
  unitIds: string[]; // unidades em que o usuário está vinculado
};

/**
 * Monta o contexto de autenticação do usuário logado:
 * - Lê o usuário da sessão
 * - Pega a role global (profiles.global_role)
 * - Pega a role e org (org_members)
 * - Pega as unidades (unit_members)
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = createClient();

  // 1) Usuário logado
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return null;
  const uid = userData.user.id;

  // 2) Role global (platform_admin) em profiles.global_role
  //    (usamos maybeSingle() para não estourar erro quando não existir)
  const { data: profile } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", uid)
    .maybeSingle();

  const platformRole: PlatformRole =
    profile?.global_role === "platform_admin" ? "platform_admin" : null;

  // 3) Role e organização do usuário em org_members
  //    (modelo: 1 usuário pertence a 1 organização)
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", uid)
    .maybeSingle();

  const orgId: string | null = orgMember?.org_id ?? null;
  const orgRole: OrgRole = (orgMember?.role as OrgRole) ?? null;

  // 4) Unidades do usuário (pode ter várias dentro da mesma org)
  const { data: unitRows } = await supabase
    .from("unit_members")
    .select("unit_id")
    .eq("user_id", uid);

  const unitIds = (unitRows ?? []).map((r) => r.unit_id as string);

  return {
    userId: uid,
    platformRole,
    orgRole,
    orgId,
    unitIds,
  };
}
