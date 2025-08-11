"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

/** Admin client (service_role) – usar só em Server Actions / Route Handlers */
async function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE");
  return createAdminClient(url, serviceKey);
}

/** Garante que o usuário logado é admin (via profiles.role) */
async function checkAdminRole() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authorized");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profileData || profileData.role !== "admin") {
    throw new Error("Not authorized");
  }
  return user;
}

/* ===================== SELF SERVICE (usuário edita o próprio perfil) ===================== */
export async function updateUserProfile(formData: FormData) {
  const supabase = createClient();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const avatarFile = formData.get("avatar") as File | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be logged in to update your profile." };

  let avatar_url: string | null | undefined;

  if (avatarFile && avatarFile.size > 0) {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`${user.id}/avatar.jpg`, avatarFile, { upsert: true });
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(uploadData.path);
    avatar_url = publicUrlData.publicUrl;
  } else if (formData.get("avatar") === "REMOVE") {
    await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`]);
    avatar_url = null;
  }

  const updateAuthData: {
    data: { name: string; avatar_url?: string | null };
    email?: string;
  } = { data: { name } };

  if (avatar_url !== undefined) updateAuthData.data.avatar_url = avatar_url;
  if (email) updateAuthData.email = email;

  const { error: authError } = await supabase.auth.updateUser(updateAuthData);
  if (authError) return { error: authError.message };

  const updateProfileData: {
    phone?: string;
    avatar_url?: string | null;
    full_name?: string;
  } = {};
  if (phone) updateProfileData.phone = phone;
  if (avatar_url !== undefined) updateProfileData.avatar_url = avatar_url;
  if (name) updateProfileData.full_name = name;

  if (Object.keys(updateProfileData).length > 0) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update(updateProfileData)
      .eq("id", user.id);
    if (profileError) return { error: profileError.message };
  }

  revalidatePath("/profile");
  return { error: null };
}

/* ===================== ADMIN: LIST/GET/UPDATE/DELETE ===================== */
export async function getUsers(): Promise<Profile[]> {
  await checkAdminRole();
  const admin = await getAdminClient();

  const { data: usersData, error } = await admin.auth.admin.listUsers();
  if (error || !usersData) {
    console.error("Error fetching users:", error);
    return [];
  }

  const ids = usersData.users.map((u) => u.id);
  if (ids.length === 0) return [];

  const { data: profiles = [] } = await admin
    .from("profiles")
    .select("*")
    .in("id", ids);

  const map = new Map((profiles as any[]).map((p) => [p.id, p]));

  return usersData.users.map((u) => ({
    id: u.id,
    email: u.email ?? "", // e-mail sempre do Auth
    full_name:
      map.get(u.id)?.full_name ?? (u.user_metadata as any)?.name ?? "No name",
    role: map.get(u.id)?.role ?? "user",
    created_at: u.created_at,
    phone: map.get(u.id)?.phone ?? null,
    avatar_url: map.get(u.id)?.avatar_url ?? null,
  }));
}

/** Perfis + e-mail do Auth (profiles não tem coluna email) */
export async function getAllProfiles(): Promise<Profile[]> {
  await checkAdminRole();
  const admin = await getAdminClient();

  const { data: profiles, error } = await admin.from("profiles").select("*");
  if (error || !profiles || profiles.length === 0) return [];

  const ids = profiles.map((p: any) => p.id as string);

  // busca e-mails no Auth por id (paralelo)
  const authResults = await Promise.all(
    ids.map((id) => admin.auth.admin.getUserById(id))
  );
  const emailById = new Map<string, string>(
    authResults
      .map((r) => r.data?.user)
      .filter(Boolean)
      .map((u) => [u!.id, u!.email ?? ""])
  );

  return (profiles as any[]).map((p) => ({
    id: p.id,
    email: emailById.get(p.id) ?? "",
    full_name: p.full_name ?? "No name",
    role: p.role ?? "user",
    created_at: p.created_at,
    phone: p.phone ?? null,
    avatar_url: p.avatar_url ?? null,
  }));
}

export async function getUserById(id: string): Promise<Profile | null> {
  await checkAdminRole();
  const admin = await getAdminClient();

  const {
    data: { user },
    error,
  } = await admin.auth.admin.getUserById(id);
  if (error || !user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "", // e-mail do Auth
    full_name:
      profile?.full_name ?? (user.user_metadata as any)?.name ?? "No name",
    role: profile?.role ?? "user",
    created_at: user.created_at,
    phone: profile?.phone ?? null,
    avatar_url: profile?.avatar_url ?? null,
  };
}

export async function updateUser(formData: FormData) {
  await checkAdminRole();
  const admin = await getAdminClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as string; // "user" | "master" | "admin"

  const { error } = await admin.auth.admin.updateUserById(id, {
    user_metadata: { name },
  });
  if (error) return { error: error.message };

  const { error: profErr } = await admin
    .from("profiles")
    .update({ full_name: name, role })
    .eq("id", id);
  if (profErr) return { error: profErr.message };

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${id}/edit`);
  return { error: null };
}

export async function deleteUser(userId: string) {
  await checkAdminRole();
  const admin = await getAdminClient();

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  // (opcional) também remover do profiles:
  // await admin.from("profiles").delete().eq("id", userId);

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { error: null };
}

/* ===================== ADMIN: CREATE (tratando e-mail duplicado) ===================== */

// procura apenas no Auth (profiles não tem email)
async function findUserIdByEmail(admin: any, email: string) {
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
  role?: string; // "user" | "master" | "admin"
  password?: string; // opcional
}) {
  await checkAdminRole();
  const admin = await getAdminClient();

  // cria no Auth
  const { data, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password || crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { name: input.full_name || null },
  });

  // trata e-mail já existente
  const exists =
    !!createErr &&
    /already been registered|already registered|email/i.test(createErr.message);

  let uid: string | null = null;

  if (exists) {
    uid = await findUserIdByEmail(admin, input.email);
    if (!uid) {
      return {
        ok: false,
        error:
          "E-mail já cadastrado e não foi possível localizar o usuário existente.",
      };
    }
  } else if (createErr || !data?.user) {
    return { ok: false, error: createErr?.message || "Falha ao criar usuário" };
  } else {
    uid = data.user.id;
  }

  // garante a linha em profiles (sem coluna email)
  const payload: any = {
    id: uid!,
    full_name: input.full_name || null,
    role: input.role || "user",
  };

  const { error: profErr } = await admin
    .from("profiles")
    .upsert(payload, { onConflict: "id" });

  if (profErr) {
    console.error("profiles upsert error:", profErr);
    return {
      ok: false,
      error: `Falha ao criar/atualizar profile: ${profErr.message}`,
    };
  }

  revalidatePath("/admin/users");
  return {
    ok: true,
    id: uid!,
    status: exists ? "updated" : ("created" as const),
  };
}
