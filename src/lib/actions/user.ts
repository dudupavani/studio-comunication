"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "../types";
import { updateProfileSelfRPC } from "@/lib/supabase/rpc";

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

  return data?.global_role === "platform_admin";
}

/** Retorna { org_id, role } do usuário logado em org_members (modelo 1 usuário -> 1 org) */
async function getMyOrgMembership(): Promise<{
  org_id: string;
  role: string;
} | null> {
  const supabase = createClient();
  const uid = await getSessionUserId();
  if (!uid) return null;

  const { data } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", uid)
    .maybeSingle();

  return data ?? null;
}

/** Garante que quem está executando é platform_admin OU org_admin da org alvo */
async function assertCanManageOrg(targetOrgId: string) {
  const [platform, me] = await Promise.all([
    isPlatformAdmin(),
    getMyOrgMembership(),
  ]);
  if (platform) return;

  if (!me || me.org_id !== targetOrgId || me.role !== "org_admin") {
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
    // fallback amigável
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
export async function getUsers(): Promise<Profile[]> {
  const supabaseAdmin = await getAdminClient();

  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error || !usersData) {
    console.error("Error fetching users:", error);
    return [];
  }

  const ids = usersData.users.map((u) => u.id);
  if (ids.length === 0) return [];

  const { data: profiles = [] } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", ids);

  const map = new Map((profiles as any[]).map((p) => [p.id, p]));

  return usersData.users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    full_name:
      map.get(u.id)?.full_name ?? (u.user_metadata as any)?.name ?? "No name",
    role: map.get(u.id)?.role ?? "user", // legado
    created_at: u.created_at,
    phone: map.get(u.id)?.phone ?? null,
    avatar_url: map.get(u.id)?.avatar_url ?? null,
  }));
}

export async function getAllProfiles(): Promise<Profile[]> {
  const supabaseAdmin = await getAdminClient();
  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*");
  if (error || !profiles) return [];
  return profiles.map((p) => ({
    id: p.id,
    email: p.email ?? "",
    full_name: p.full_name ?? "No name",
    role: p.role ?? "user",
    created_at: p.created_at,
    phone: p.phone ?? null,
    avatar_url: p.avatar_url ?? null,
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
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    full_name:
      profile?.full_name ?? (user.user_metadata as any)?.name ?? "No name",
    role: profile?.role ?? "user", // legado
    created_at: user.created_at,
    phone: profile?.phone ?? null,
    avatar_url: profile?.avatar_url ?? null,
  };
}

/* ===================== ADMIN: UPDATE ===================== */
export async function updateUser(formData: FormData) {
  const supabaseAdmin = await getAdminClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const role = (formData.get("role") as string) || "user"; // "user" | "master" | "admin"

  if (!id) return { error: "ID do usuário é obrigatório." };
  if (!name) return { error: "Nome é obrigatório." };

  // 1) NUNCA permitir operações envolvendo platform_admin
  const { data: target, error: getErr } = await supabaseAdmin
    .from("profiles")
    .select("id, role, global_role")
    .eq("id", id)
    .single();

  if (getErr || !target) return { error: "Usuário não encontrado." };

  if (
    target.role === "platform_admin" ||
    target.global_role === "platform_admin"
  ) {
    return {
      error:
        "Usuários com role=platform_admin não podem ser editados por esta interface.",
    };
  }

  if (role === "platform_admin") {
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
    .update({ full_name: name, role }) // permitido: user/master/admin
    .eq("id", id);

  if (profErr) return { error: profErr.message };

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}/edit`);
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

  if (
    target?.role === "platform_admin" ||
    target?.global_role === "platform_admin"
  ) {
    return {
      error:
        "Usuários com role=platform_admin não podem ser deletados automaticamente.",
    };
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  // (opcional) também remover do profiles:
  // await supabaseAdmin.from("profiles").delete().eq("id", userId);

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { error: null };
}

/* ===================== ADMIN: CREATE (mantido, com regras) ===================== */
async function findUserIdByEmail(admin: any, email: string) {
  // varre páginas do Auth para localizar pelo email
  for (let page = 1; page <= 5; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const found = data?.users.find(
      (u: any) => (u.email || "").toLowerCase() === email.toLowerCase()
    );
    if (found) return found.id as string;
    if (!data || (data.users?.length ?? 0) < 200) break;
  }
  return null;
}

// Função createUserAsAdmin removida. Use apenas o fluxo de convite por Magic Link.
