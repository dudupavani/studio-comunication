// src/lib/auth/user-roles.ts
import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/types/app-role";

/**
 * Obtém o papel do usuário na organização
 */
export async function getUserOrgRole(
  userId: string,
  orgId: string
): Promise<AppRole | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .single();
    
  if (error) {
    console.error("Erro ao obter papel do usuário na organização:", error);
    return null;
  }
  
  return data?.role || null;
}

/**
 * Obtém o papel do usuário em uma unidade
 */
export async function getUserUnitRole(
  userId: string,
  unitId: string
): Promise<AppRole | null> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("unit_members")
    .select("role")
    .eq("user_id", userId)
    .eq("unit_id", unitId)
    .single();
    
  if (error) {
    console.error("Erro ao obter papel do usuário na unidade:", error);
    return null;
  }
  
  return data?.role || null;
}

/**
 * Obtém todos os papéis do usuário em unidades de uma organização
 */
export async function getUserUnitRoles(
  userId: string,
  orgId: string
): Promise<{ unitId: string; role: AppRole }[]> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("unit_members")
    .select("unit_id, role")
    .eq("user_id", userId)
    .eq("org_id", orgId);
    
  if (error) {
    console.error("Erro ao obter papéis do usuário nas unidades:", error);
    return [];
  }
  
  return data.map(item => ({
    unitId: item.unit_id,
    role: item.role
  }));
}

/**
 * Verifica se o usuário é membro de uma organização
 */
export async function isOrgMember(
  userId: string,
  orgId: string
): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", userId)
    .eq("org_id", orgId)
    .single();
    
  if (error) {
    return false;
  }
  
  return !!data;
}

/**
 * Verifica se o usuário é membro de uma unidade
 */
export async function isUnitMember(
  userId: string,
  unitId: string
): Promise<boolean> {
  const supabase = createClient();
  
  const { data, error } = await supabase
    .from("unit_members")
    .select("id")
    .eq("user_id", userId)
    .eq("unit_id", unitId)
    .single();
    
  if (error) {
    return false;
  }
  
  return !!data;
}