// src/lib/actions/unit-members.ts
"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import type { UnitRole } from "@/lib/types/roles";
import { UNIT_ROLES, UNIT_USER } from "@/lib/types/roles";

export type UnitMember = {
  user_id: string;
  role: UnitRole;
  profiles: { full_name: string | null; email: string | null } | null;
};

export async function listUnitMembers(orgId: string, unitId: string) {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("unit_members")
    .select("user_id, role, profiles:profiles!inner(id, full_name, email)")
    .eq("org_id", orgId)
    .eq("unit_id", unitId)
    .order("user_id", { ascending: true }); // ordem estável sem depender de created_at

  if (error) {
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, data: (data as unknown as UnitMember[]) ?? [] };
}

type AddUnitMemberResult =
  | { ok: true; data: UnitMember }
  | { ok: false; error: string };

const DEFAULT_UNIT_ROLE: UnitRole = UNIT_USER;

export async function addUnitMember(params: {
  orgId: string;
  unitId: string;
  unitSlug: string;
  userId: string;
  role: UnitRole;
}): Promise<AddUnitMemberResult> {
  const supabase = createServiceClient();

  // Verifica se usuário pertence à organização
  const { data: orgMember } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", params.orgId)
    .eq("user_id", params.userId)
    .single();

  if (!orgMember) {
    return {
      ok: false,
      error: "Usuário não pertence a esta organização",
    };
  }

  // Verifica se já está vinculado à unidade
  const { data: existing } = await supabase
    .from("unit_members")
    .select("*")
    .eq("unit_id", params.unitId)
    .eq("user_id", params.userId)
    .single();

  if (existing) {
    return {
      ok: false,
      error: "Usuário já vinculado a esta unidade",
    };
  }

  // Insere vínculo
  const { data, error } = await supabase
    .from("unit_members")
    .insert({
      org_id: params.orgId,
      unit_id: params.unitId,
      user_id: params.userId,
      role: params.role,
    })
    .select("user_id, role, profiles:profiles!inner(id, full_name, email)")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Revalida as páginas que podem mostrar membros da unidade
  revalidatePath(`/unidades/${params.unitSlug}`);
  revalidatePath(`/unidades/${params.unitSlug}/members`);

  return {
    ok: true,
    data: data as unknown as UnitMember,
  };
}

export async function removeUnitMember(params: {
  orgId: string;
  unitId: string;
  unitSlug: string;
  userId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createServiceClient();

  // Verifica se usuário está vinculado à unidade
  const { data: existing } = await supabase
    .from("unit_members")
    .select("*")
    .eq("unit_id", params.unitId)
    .eq("user_id", params.userId)
    .single();

  if (!existing) {
    return {
      ok: false,
      error: "Usuário não está vinculado a esta unidade",
    };
  }

  const { error } = await supabase
    .from("unit_members")
    .delete()
    .eq("unit_id", params.unitId)
    .eq("user_id", params.userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  // Revalida as páginas que podem mostrar membros da unidade
  revalidatePath(`/unidades/${params.unitSlug}`);
  revalidatePath(`/unidades/${params.unitSlug}/members`);
}
