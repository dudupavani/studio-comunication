import { createServiceClient } from "@/lib/supabase/service";
import type { AuthContext } from "@/lib/auth-context";
import type { Database } from "@/lib/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];
export type OrgMember = Database["public"]["Tables"]["org_members"]["Row"];

/**
 * Verifica se o usuário autenticado tem permissão para operações administrativas
 * @param auth - Contexto de autenticação do usuário
 * @param targetOrgId - ID da organização alvo da operação
 * @returns true se o usuário tem permissão, false caso contrário
 */
export function canManageOrgMembers(auth: AuthContext, targetOrgId: string): boolean {
  // Platform admin pode tudo
  if (auth.platformRole === "platform_admin") {
    return true;
  }
  
  // Org admin só pode operar dentro da sua própria organização
  if (auth.orgId === targetOrgId && (auth.orgRole === "org_admin" || auth.orgRole === "org_master")) {
    return true;
  }
  
  return false;
}

/**
 * Lista todos os membros de uma organização
 * @param orgId - ID da organização
 * @returns Lista de membros da organização
 */
export async function adminListMembers(orgId: string): Promise<{ data: OrgMember[] | null; error: any }> {
  const supabaseAdmin = createServiceClient();
  
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("*")
    .eq("org_id", orgId);
  
  return { data, error };
}

/**
 * Atualiza o papel de um membro em uma organização
 * @param orgId - ID da organização
 * @param userId - ID do usuário
 * @param role - Novo papel do usuário
 * @returns Informação sobre sucesso ou erro da operação
 */
export async function adminUpdateMemberRole(
  orgId: string,
  userId: string,
  role: AppRole
): Promise<{ error: any }> {
  const supabaseAdmin = createServiceClient();
  
  const { error } = await supabaseAdmin
    .from("org_members")
    .update({ role })
    .eq("org_id", orgId)
    .eq("user_id", userId);
  
  return { error };
}

/**
 * Remove um membro de uma organização
 * @param orgId - ID da organização
 * @param userId - ID do usuário a ser removido
 * @returns Informação sobre sucesso ou erro da operação
 */
export async function adminRemoveMember(
  orgId: string,
  userId: string
): Promise<{ error: any }> {
  const supabaseAdmin = createServiceClient();
  
  const { error } = await supabaseAdmin
    .from("org_members")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", userId);
  
  return { error };
}

/**
 * Adiciona um membro a uma organização
 * @param orgId - ID da organização
 * @param userId - ID do usuário a ser adicionado
 * @param role - Papel do usuário
 * @returns Informação sobre sucesso ou erro da operação
 */
export async function adminAddMember(
  orgId: string,
  userId: string,
  role: AppRole
): Promise<{ error: any }> {
  const supabaseAdmin = createServiceClient();
  
  const { error } = await supabaseAdmin
    .from("org_members")
    .insert({
      org_id: orgId,
      user_id: userId,
      role
    });
  
  return { error };
}

/**
 * Busca um membro específico de uma organização
 * @param orgId - ID da organização
 * @param userId - ID do usuário a ser buscado
 * @returns Informações do membro ou null se não encontrado
 */
export async function adminGetMember(
  orgId: string,
  userId: string
): Promise<{ data: OrgMember | null; error: any }> {
  const supabaseAdmin = createServiceClient();
  
  const { data, error } = await supabaseAdmin
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  
  return { data, error };
}
