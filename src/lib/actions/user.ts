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

/** Saneia role caso venha de view com cast "'unit_user'::text" */
function normalizeRole(role: any): string {
  if (!role) return "user";
  const s = String(role);
  return s.replace(/^'+|'+$/g, "").replace(/::text$/i, "") || "user";
}

export async function getUsers(orgId?: string): Promise<Profile[]> {
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
      "id, full_name, phone, avatar_url, role, disabled, created_at, org_id" // Adicionada a coluna 'org_id'
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

  const safeProfiles: any[] = Array.isArray(profiles) ? profiles : [];
  const map = new Map(safeProfiles.map((p) => [p.id, p]));

  return usersData.users.map((u) => {
    const p: any = map.get(u.id) || {};
    return {
      id: u.id,
      email: p.email ?? u.email ?? "",
      full_name: p.full_name ?? (u.user_metadata as any)?.name ?? "No name",
      role: normalizeRole(p.role),
      created_at: p.created_at ?? u.created_at,
      phone: p.phone ?? null,
      avatar_url: p.avatar_url ?? null,
      // novo: expõe disabled para a UI alternar Ativar/Desativar
      disabled: Boolean(p.disabled ?? false),
    } as Profile & { disabled?: boolean };
  });
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabaseAdmin = await getAdminClient();
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, email, full_name, role, created_at, phone, avatar_url, disabled"
    );
  if (error || !profiles) return [];
  return profiles.map((p: any) => ({
    id: p.id,
    email: p.email ?? "",
    full_name: p.full_name ?? "No name",
    role: normalizeRole(p.role),
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
      "id, email, full_name, role, created_at, phone, avatar_url, disabled"
    )
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    full_name:
      profile?.full_name ?? (user.user_metadata as any)?.name ?? "No name",
    role: normalizeRole(profile?.role),
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
  const role = normalizeRole((formData.get("role") as string) || "user");

  if (!id) return { error: "ID do usuário é obrigatório." };
  if (!name) return { error: "Nome é obrigatório." };

  // 1) NUNCA permitir operações envolvendo platform_admin
  const { data: target, error: getErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role, global_role")
    .eq("id", id)
    .single();

  if (getErr || !target) return { error: "Usuário não encontrado." };

  const targetRole = normalizeRole(target.role);
  if (
    targetRole === PLATFORM_ADMIN ||
    target.global_role === PLATFORM_ADMIN
  ) {
    return {
      error:
        "Usuários com role=platform_admin não podem ser editados por esta interface.",
    };
  }

  const DEFAULT_PLATFORM_ROLE: PlatformRole = PLATFORM_ADMIN;
  const DEFAULT_ORG_ROLE: OrgRole = ORG_ADMIN;
  const DEFAULT_UNIT_ROLE: UnitRole = UNIT_USER;
  
  if (role === PLATFORM_ADMIN) {
    return {
      error:
        "Atribuir role=platform_admin só é permitido manualmente pelo owner (postgres).",
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
    .update({ full_name: name, role })
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
    .select("role, global_role")
    .eq("id", userId)
    .maybeSingle();

  const targetRole = normalizeRole(target?.role);
  if (
    targetRole === PLATFORM_ADMIN ||
    target?.global_role === PLATFORM_ADMIN
  ) {
    return {
      error:
        "Usuários com role=platform_admin não podem ser deletados automaticamente.",
    };
  }

  const del = await safeDeleteUser(userId);
  if (!del.ok) return { error: del.error };

  revalidatePath("/users");
  revalidatePath("/users");
  return { error: null };
}

/* ===================== ADMIN: CREATE ===================== */
// Função createUserAsAdmin removida. Use apenas o fluxo de convite por Magic Link.
