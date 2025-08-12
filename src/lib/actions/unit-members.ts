"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types/db";

export type UnitMemberRole = "unit_master" | "unit_user";

export type UnitMember = {
  unit_id: string;
  user_id: string;
  org_id: string;
  role: UnitMemberRole;
  email?: string | null;
  name?: string | null;
  created_at?: string;
};

export async function listUnitMembers(unit_id: string): Promise<UnitMember[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("unit_members")
    .select(
      `
      unit_id, user_id, org_id, role, created_at,
      profiles:profiles!unit_members_user_id_fkey(id, email, full_name)
    `
    )
    .eq("unit_id", unit_id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Erro ao listar membros da unidade:", error);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    unit_id: row.unit_id,
    user_id: row.user_id,
    org_id: row.org_id,
    role: row.role,
    created_at: row.created_at,
    email: row.profiles?.email ?? null,
    name: row.profiles?.full_name ?? null,
  }));
}

export async function addUnitMember(input: {
  org_id: string;
  unit_id: string;
  user_id: string;
  role: UnitMemberRole;
}): Promise<ActionResult<UnitMember>> {
  const supabase = await createClient();
  const { org_id, unit_id, user_id, role } = input;

  const { data, error } = await supabase
    .from("unit_members")
    .insert([{ org_id, unit_id, user_id, role }])
    .select()
    .single();

  if (error) {
    console.error("Erro ao adicionar membro à unidade:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data };
}

export async function removeUnitMember(input: {
  unit_id: string;
  user_id: string;
}): Promise<ActionResult<null>> {
  const supabase = await createClient();
  const { unit_id, user_id } = input;

  const { error } = await supabase
    .from("unit_members")
    .delete()
    .eq("unit_id", unit_id)
    .eq("user_id", user_id);

  if (error) {
    console.error("Erro ao remover membro da unidade:", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, data: null };
}
