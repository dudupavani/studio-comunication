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

export async function createUserAsAdmin(input: {
  email: string;
  full_name?: string;
  orgId?: string;
  orgRole: "org_admin" | "unit_master" | "unit_user";
  password?: string;
}) {
  const admin = await getAdminClient();

  // Quem está executando?
  const platform = await isPlatformAdmin();
  const myMembership = await getMyOrgMembership();

  // Determina org alvo
  let targetOrgId: string | null = null;
  if (platform) {
    if (!input.orgId) {
      return {
        ok: false,
        error: "É necessário informar a organização (orgId).",
      };
    }
    targetOrgId = input.orgId;
  } else {
    // precisa ser org_admin e usar sua própria org
    await assertCanManageOrg(myMembership?.org_id ?? "");
    targetOrgId = myMembership!.org_id;
  }

  // 1) Tenta criar no Auth
  const { data, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password || crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { name: input.full_name || null },
  });

  let uid: string | null = null;

  // 2) Trata e-mail já existente no Auth
  const exists =
    !!createErr &&
    /already been registered|already registered|email/i.test(createErr.message);

  if (exists) {
    uid = await findUserIdByEmail(admin, input.email);
    if (!uid) {
      return {
        ok: false,
        error:
          "E-mail já cadastrado e não foi possível localizar o usuário existente.",
      };
    }

    // Verifica se já possui vínculo em org_members e se é de outra organização
    const { data: existingMembership } = await admin
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", uid)
      .maybeSingle();

    if (existingMembership && existingMembership.org_id !== targetOrgId) {
      return {
        ok: false,
        error:
          "Este usuário já pertence a outra organização. Não é possível vinculá-lo aqui.",
      };
    }
  } else if (createErr || !data?.user) {
    return { ok: false, error: createErr?.message || "Falha ao criar usuário" };
  } else {
    uid = data.user.id;
  }

  // 3) Garante linha em profiles (somente nome / fields não sensíveis)
  {
    const { error: profErr } = await admin.from("profiles").upsert(
      {
        id: uid!,
        full_name: input.full_name || null,
        // NÃO gravamos email aqui por segurança
      },
      { onConflict: "id" }
    );

    if (profErr) {
      console.error("profiles upsert error:", profErr);
      return {
        ok: false,
        error: `Falha ao salvar profile: ${profErr.message}`,
      };
    }
  }

  // 4) Garante vínculo em org_members
  {
    const { error: orgErr } = await admin.from("org_members").upsert(
      {
        org_id: targetOrgId!,
        user_id: uid!,
        role: input.orgRole,
      },
      { onConflict: "org_id,user_id" }
    );

    if (orgErr) {
      console.error("org_members upsert error:", orgErr);
      return {
        ok: false,
        error: `Falha ao vincular à organização: ${orgErr.message}`,
      };
    }
  }

  revalidatePath("/admin/users");
  return {
    ok: true,
    id: uid!,
    status: exists ? "updated" : ("created" as const),
  };
}
