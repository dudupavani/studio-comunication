"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "../types";
import { updateProfileSelfRPC } from "@/lib/supabase/rpc";
import type { PlatformRole, OrgRole, UnitRole, AppRole } from "@/lib/types/roles";
import { PLATFORM_ROLES, ORG_ROLES, UNIT_ROLES, APP_ROLES } from "@/lib/types/roles";
import { safeDeleteUser } from "@/lib/auth/safe-delete";

/** Admin client (service_role) – usar só em Server Actions / Route Handlers */
async function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE");
  return createAdminClient(url, serviceKey);
}

/** Helpers mínimos para este passo */
async function getSessionUserId() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw new Error(error.message);
  return data.user?.id ?? null;
}

/** platform_admin vem de profiles.global_role */
async function isPlatformAdmin(): Promise<boolean> {
  const supabase = createClient();
  const uid = await getSessionUserId();
  if (!uid) return false;

  const { data } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", uid)
    .maybeSingle();

  return data?.global_role === PLATFORM_ADMIN;
}

/** Retorna { org_id, role } do usuário logado em org_members (modelo 1 usuário -> 1 org) */
async function getMyOrgMembership(): Promise<{
  org_id: string;
  role: OrgRole;
} | null> {
  const supabase = createClient();
  const uid = await getSessionUserId();
  if (!uid) return null;

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", uid)
    .maybeSingle();

  return data ? { org_id: data.org_id, role: data.role as OrgRole } : null;
}

/** Garante que quem está executando é platform_admin OU org_admin da org alvo */
async function assertCanManageOrg(targetOrgId: string) {
  const [platform, me] = await Promise.all([
    isPlatformAdmin(),
    getMyOrgMembership(),
  ]);
  if (platform) return;

  if (!me || me.org_id !== targetOrgId || me.role !== ORG_ADMIN) {
    throw new Error("Acesso negado: você não pode gerenciar esta organização.");
  }
}

/* ===================== SELF SERVICE (usuário edita o próprio perfil) ===================== */
export async function updateUserProfile(formData: FormData) {
  const supabase = createClient();

  const name = (formData.get("name") as string) ?? null;
  const email = (formData.get("email") as string) ?? null;
  const phone = (formData.get("phone") as string) ?? null;
  const avatarInput = formData.get("avatar");

  // sessão
  const {
    data: { user },
    error: authGetErr,
  } = await supabase.auth.getUser();
  if (!user || authGetErr) {
    return { error: "You must be logged in to update your profile." };
  }

  // 1) Upload/remoção do avatar -> definir avatar_url (null = remover; undefined = manter)
  let avatar_url: string | null | undefined = undefined;

  if (
    avatarInput &&
    avatarInput !== "REMOVE" &&
    typeof avatarInput !== "string"
  ) {
    const file = avatarInput as File;
    if (file.size > 0) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(`${user.id}/avatar.jpg`, file, { upsert: true });

      if (uploadError) return { error: uploadError.message };

      const { data: publicUrlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      avatar_url = publicUrlData.publicUrl;
    }
  } else if (avatarInput === "REMOVE") {
    await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
    avatar_url = null; // sinaliza remoção
  }

  // 2) Atualizar dados no Auth (nome/avatar/email)
  const authPayload: {
    data: { name?: string; avatar_url?: string | null };
    email?: string;
  } = { data: {} };

  if (name) authPayload.data.name = name;
  if (typeof avatar_url !== "undefined")
    authPayload.data.avatar_url = avatar_url;
  if (email) authPayload.email = email;

  if (Object.keys(authPayload.data).length || authPayload.email) {
    const { error: authUpdateErr } = await supabase.auth.updateUser(
      authPayload
    );
    if (authUpdateErr) {
      return { error: authUpdateErr.message };
    }
  }

  // 3) Atualizar PROFILE via RPC segura (não toca em role/global_role)
  const { error: rpcError } = await updateProfileSelfRPC({
    full_name: name,
    phone,
    avatar_url, // null = remover; undefined = manter; string = nova URL
  });

  if (rpcError) {
    if (/platform_admin/i.test(rpcError)) {
      return {
        error:
          "Não é possível alterar a role platform_admin por aqui. Seus dados pessoais foram mantidos.",
      };
    }
    return { error: rpcError };
  }

  // 4) Revalidate
  revalidatePath("/profile");
  return { error: null };
}

/* ===================== ADMIN: LIST/GET ===================== */

export async function getUsers(orgId?: string): Promise<(Profile & { 
  org_role?: string; 
  unit_roles?: string[]; 
  unit_names?: string[]; 
  disabled?: boolean 
})[]> {
  const supabaseAdmin = await getAdminClient();

  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error || !usersData) {
    console.error("Error fetching users:", error);
    return [];
  }

  const ids = usersData.users.map((u) => u.id);
  if (ids.length === 0) return [];

  console.log("IDs para busca de profiles:", ids); // Log dos IDs

  // Busca profiles relacionados
  let query = supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, phone, avatar_url, global_role, disabled, created_at, org_id" // Adicionada a coluna 'org_id'
    )
    .in("id", ids);

  // Filtra por orgId se fornecido
  if (orgId) {
    query = query.eq("org_id", orgId);
  }

  const { data: profiles, error: profilesErr } = await query;

  if (profilesErr) {
    console.error("Erro buscando profiles:", profilesErr); // Log detalhado do erro
  }

  // Buscar org_roles para todos os usuários
  const { data: orgMembersData, error: orgMembersErr } = await supabaseAdmin
    .from("org_members")
    .select("user_id, role")
    .in("user_id", ids);

  if (orgMembersErr) {
    console.error("Erro buscando org_members:", orgMembersErr);
  }

  // Buscar unit_roles e nomes das unidades para todos os usuários
  let unitMembersData: any[] = [];
  let unitMembersErr: any = null;
  
  if (ids.length > 0) {
    // Primeiro, buscar os registros de unit_members
    const unitMembersResult = await supabaseAdmin
      .from("unit_members")
      .select("user_id, role, unit_id")
      .in("user_id", ids);
      
    unitMembersErr = unitMembersResult.error;
    
    if (!unitMembersErr && unitMembersResult.data) {
      unitMembersData = unitMembersResult.data;
      
      // Depois, buscar os nomes das unidades
      const unitIds = [...new Set(unitMembersData.map((um: any) => um.unit_id))];
      if (unitIds.length > 0) {
        const unitsResult = await supabaseAdmin
          .from("units")
          .select("id, name")
          .in("id", unitIds);
          
        if (!unitsResult.error && unitsResult.data) {
          // Mapear os nomes das unidades para os registros de unit_members
          const unitNameMap = new Map(unitsResult.data.map((unit: any) => [unit.id, unit.name]));
          unitMembersData = unitMembersData.map((um: any) => ({
            ...um,
            units: { name: unitNameMap.get(um.unit_id) || null }
          }));
        }
      }
    }
  }

  if (unitMembersErr) {
    console.error("Erro buscando unit_members:", unitMembersErr);
  }

  const safeProfiles: any[] = Array.isArray(profiles) ? profiles : [];
  const profileMap = new Map(safeProfiles.map((p) => [p.id, p]));
  
  const orgRoleMap = new Map<string, string>();
  if (Array.isArray(orgMembersData)) {
    orgMembersData.forEach(orgMember => {
      orgRoleMap.set(orgMember.user_id, orgMember.role);
    });
  }
  
  const unitRolesMap = new Map<string, string[]>();
  const unitNamesMap = new Map<string, string[]>();
  if (Array.isArray(unitMembersData)) {
    unitMembersData.forEach(unitMember => {
      if (!unitRolesMap.has(unitMember.user_id)) {
        unitRolesMap.set(unitMember.user_id, []);
        unitNamesMap.set(unitMember.user_id, []);
      }
      unitRolesMap.get(unitMember.user_id)?.push(unitMember.role);
      // Adiciona o nome da unidade se disponível
      if (unitMember.units?.name) {
        unitNamesMap.get(unitMember.user_id)?.push(unitMember.units.name);
      }
    });
  }

  return usersData.users.map((u) => {
    const p: any = profileMap.get(u.id) || {};
    const orgRole = orgRoleMap.get(u.id);
    const unitRoles = unitRolesMap.get(u.id) || [];
    const unitNames = unitNamesMap.get(u.id) || [];
    
    return {
      id: u.id,
      email: p.email ?? u.email ?? "",
      full_name: p.full_name ?? (u.user_metadata as any)?.name ?? "No name",
      global_role: p.global_role,
      org_role: orgRole,
      unit_roles: unitRoles,
      unit_names: unitNames,
      created_at: p.created_at ?? u.created_at,
      phone: p.phone ?? null,
      avatar_url: p.avatar_url ?? null,
      // novo: expõe disabled para a UI alternar Ativar/Desativar
      disabled: Boolean(p.disabled ?? false),
    };
  });
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabaseAdmin = await getAdminClient();
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, email, full_name, global_role, created_at, phone, avatar_url, disabled"
    );
  if (error || !profiles) return [];
  return profiles.map((p: any) => ({
    id: p.id,
    email: p.email ?? "",
    full_name: p.full_name ?? "No name",
    global_role: p.global_role,
    created_at: p.created_at,
    phone: p.phone ?? null,
    avatar_url: p.avatar_url ?? null,
    disabled: Boolean(p.disabled ?? false),
  }));
}

export async function getUserById(id: string): Promise<Profile | null> {
  const supabaseAdmin = await getAdminClient();

  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.admin.getUserById(id);
  if (error || !user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, email, full_name, global_role, created_at, phone, avatar_url, disabled"
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    full_name:
      profile?.full_name ?? (user.user_metadata as any)?.name ?? "No name",
    global_role: profile?.global_role ?? null,
    created_at: profile?.created_at ?? user.created_at,
    phone: profile?.phone ?? null,
    avatar_url: profile?.avatar_url ?? null,
    disabled: Boolean(profile?.disabled ?? false),
  } as Profile & { disabled?: boolean };
}

/* ===================== ADMIN: UPDATE ===================== */
export async function updateUser(formData: FormData) {
  const supabaseAdmin = await getAdminClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;

  if (!id) return { error: "ID do usuário é obrigatório." };
  if (!name) return { error: "Nome é obrigatório." };

  // 1) NUNCA permitir operações envolvendo platform_admin
  const { data: target, error: getErr } = await supabaseAdmin
    .from("profiles")
    .select("id, global_role")
    .eq("id", id)
    .single();

  if (getErr || !target) return { error: "Usuário não encontrado." };

  if (target.global_role === PLATFORM_ADMIN) {
    return {
      error:
        "Usuários com global_role=platform_admin não podem ser editados por esta interface.",
    };
  }

  // 2) Atualiza metadados (nome) no Auth
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { name },
  });
  if (error) return { error: error.message };

  // 3) Atualiza apenas campos permitidos no profile
  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: name })
    .eq("id", id);

  if (profErr) return { error: profErr.message };

  revalidatePath("/users");
  revalidatePath("/users");
  revalidatePath(`/users/${id}/edit`);
  return { error: null };
}

/* ===================== ADMIN: DELETE ===================== */
export async function deleteUser(userId: string) {
  const supabaseAdmin = await getAdminClient();

  // Proteção: NUNCA deletar platform_admin
  const { data: target } = await supabaseAdmin
    .from("profiles")
    .select("global_role")
    .eq("id", userId)
    .maybeSingle();

  if (target?.global_role === PLATFORM_ADMIN) {
    return {
      error:
        "Usuários com global_role=platform_admin não podem ser deletados automaticamente.",
    };
  }

  const del = await safeDeleteUser(userId);
  if (!del.ok) return { error: del.error };

  revalidatePath("/users");
  revalidatePath("/users");
  return { error: null };
}

/* ===================== ADMIN: UPDATE ROLES ===================== */
type UpdateUserRolesInput = {
  userId: string;
  orgId: string;
  targetRole: "org_master" | "unit_master" | "unit_user";
  unitId?: string | null;
};

export async function updateUserRoles(input: UpdateUserRolesInput) {
  const { userId, orgId, targetRole, unitId } = input;
  const supabase = await createClient();

  // Verifica quem está executando
  const {
    data: { user },
    error: sessionErr,
  } = await supabase.auth.getUser();
  if (sessionErr || !user) {
    return { ok: false, error: "Not authenticated" };
  }

  // Confere se é org_admin na mesma org ou platform_admin
  const { data: canDo, error: permErr } = await supabase.rpc("is_platform_admin");
  if (permErr) return { ok: false, error: permErr.message };

  let isPlatformAdmin = Boolean(canDo);

  if (!isPlatformAdmin) {
    const { data: meIsOrgAdmin, error: orgCheckErr } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", user.id)
      .eq("role", "org_admin")
      .maybeSingle();

    if (orgCheckErr) return { ok: false, error: orgCheckErr.message };
    if (!meIsOrgAdmin) return { ok: false, error: "Forbidden" };
  }

  // Garante que o usuário de destino tem o vínculo org_members (necessário para unit_members FK)
  const { data: membership, error: omErr } = await supabase
    .from("org_members")
    .select("org_id, user_id, role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (omErr) return { ok: false, error: omErr.message };

  if (!membership) {
    // cria vínculo mínimo (org_master por segurança ou o menor poder se você tiver)
    const { error: insertOmErr } = await supabase.from("org_members").insert({
      org_id: orgId,
      user_id: userId,
      role: targetRole === "org_master" ? "org_master" : "org_master", // mantém org_master como padrão
    });
    if (insertOmErr) return { ok: false, error: insertOmErr.message };
  }

  if (targetRole === "org_master") {
    // Atualiza papel na organização
    const { error: upOmErr } = await supabase
      .from("org_members")
      .update({ role: "org_master" })
      .eq("org_id", orgId)
      .eq("user_id", userId);
    if (upOmErr) return { ok: false, error: upOmErr.message };

    // (Opcional) Poderíamos remover papéis de unidade, mas manteremos como está para não quebrar UX.
    return { ok: true };
  }

  // Se for unit_master ou unit_user, exige unitId
  if (!unitId) return { ok: false, error: "unitId is required for unit roles" };

  // Upsert em unit_members
  const { error: upUmErr } = await supabase
    .from("unit_members")
    .upsert(
      {
        unit_id: unitId,
        user_id: userId,
        org_id: orgId,
        role: targetRole, // "unit_master" | "unit_user"
      },
      { onConflict: "unit_id,user_id" }
    );
  if (upUmErr) return { ok: false, error: upUmErr.message };

  return { ok: true };
}

/* ===================== GET USER ROLES ===================== */
type UserRoles = {
  orgRole: "org_master" | "org_admin" | null;
  unitRoles: { unitId: string; role: "unit_master" | "unit_user" }[];
};

export async function getUserRoles(userId: string, orgId: string): Promise<Result<UserRoles>> {
  const supabase = await createClient();

  // Get org role
  const { data: orgMembership, error: orgErr } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();

  if (orgErr) return { ok: false, error: orgErr.message };

  // Get unit roles
  const { data: unitMemberships, error: unitErr } = await supabase
    .from("unit_members")
    .select("unit_id, role")
    .eq("org_id", orgId)
    .eq("user_id", userId);

  if (unitErr) return { ok: false, error: unitErr.message };

  const unitRoles = (unitMemberships || []).map((um: any) => ({
    unitId: um.unit_id,
    role: um.role
  }));

  return {
    ok: true,
    data: {
      orgRole: orgMembership?.role || null,
      unitRoles
    }
  };
}

/* ===================== ADMIN: CREATE ===================== */
// Função createUserAsAdmin removida. Use apenas o fluxo de convite por Magic Link.
