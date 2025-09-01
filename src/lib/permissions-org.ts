// src/lib/permissions-org.ts
import { createClient } from "@/lib/supabase/server";

export async function isOrgAdminFor(orgId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("isOrgAdminFor — org_members error", {
        orgId,
        userId,
        error,
      });
      console.log("DEBUG isOrgAdminFor:", { orgId, userId, isAdmin: false });
    }
    return false;
  }

  const isAdmin = data?.role === "org_admin";
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG isOrgAdminFor:", { orgId, userId, isAdmin });
  }
  return isAdmin;
}

/**
 * ⚠️ Schema atual não possui 'role' em unit_members.
 * Regra conservadora:
 *  - 'org_master' (nível de organização) é considerado apto a gerenciar a unidade.
 *  - Caso contrário, retornamos false (até existir papel unitário real, ex.: 'unit_master').
 *
 * Obs.: não selecionamos colunas inexistentes em 'unit_members'.
 */
export async function isUnitMasterFor(
  orgId: string,
  unitId: string,
  userId: string
) {
  const supabase = await createClient();

  // 1) Se for org_master, consideramos com permissão de gestão da unidade
  const { data: org, error: orgErr } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orgErr) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("isUnitMasterFor — org_members error", {
        orgId,
        unitId,
        userId,
        error: orgErr,
      });
    }
    return false;
  }
  if (org?.role === "org_master") {
    return true;
  }

  // 2) Com o schema atual, 'unit_members' não possui 'role'.
  //    Mantemos uma checagem de membership (para futura extensão), sem alterar o retorno.
  const { error: unitErr } = await supabase
    .from("unit_members")
    .select("user_id") // ✅ NÃO existe 'role' aqui
    .eq("org_id", orgId)
    .eq("unit_id", unitId)
    .eq("user_id", userId)
    .maybeSingle();

  if (unitErr && process.env.NODE_ENV !== "production") {
    console.warn("isUnitMasterFor — unit_members check error", {
      orgId,
      unitId,
      userId,
      error: unitErr,
    });
  }

  // ⚠️ até existir papel unitário real (ex.: tabela unit_roles), retornamos false
  return false;
}
