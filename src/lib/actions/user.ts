"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

export async function updateUserProfile(formData: FormData) {
  const supabase = createClient(); // não precisa await
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
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove([`${user.id}/avatar.jpg`]);
    if (removeError) console.error("Error removing avatar:", removeError);
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

async function getAdminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Missing SUPABASE_URL/SERVICE_ROLE");
  return createAdminClient(url, serviceKey);
}

async function checkAdminRole() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authorized");

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || profileData?.role !== "admin") {
    throw new Error("Not authorized");
  }
  return user;
}

export async function getUsers(): Promise<Profile[]> {
  await checkAdminRole();
  const supabaseAdmin = await getAdminClient();

  const { data: usersData, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  const userIds = usersData.users.map((u) => u.id);

  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return [];
  }

  const profilesMap = new Map(profilesData.map((p) => [p.id, p]));

  return usersData.users.map((user) => ({
    id: user.id,
    email: user.email ?? "",
    full_name:
      profilesMap.get(user.id)?.full_name ??
      (user.user_metadata as any)?.name ??
      "No name",
    role: profilesMap.get(user.id)?.role ?? "user",
    created_at: user.created_at,
    phone: profilesMap.get(user.id)?.phone ?? null,
    avatar_url: profilesMap.get(user.id)?.avatar_url ?? null,
  }));
}

export async function getAllProfiles(): Promise<Profile[]> {
  await checkAdminRole();
  const supabaseAdmin = await getAdminClient();

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*");

  if (error) {
    console.error("Error fetching all profiles:", error);
    return [];
  }

  return profiles.map((profile) => ({
    id: profile.id,
    email: profile.email ?? "",
    full_name: profile.full_name ?? "No name",
    role: profile.role ?? "user",
    created_at: profile.created_at,
    phone: profile.phone ?? null,
    avatar_url: profile.avatar_url ?? null,
  }));
}

export async function getUserById(id: string): Promise<Profile | null> {
  await checkAdminRole();
  const supabaseAdmin = await getAdminClient();

  const {
    data: { user },
    error: userErr,
  } = await supabaseAdmin.auth.admin.getUserById(id);
  if (userErr || !user) {
    console.error("Error fetching user:", userErr);
    return null;
  }

  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", user.id) // ajuste se sua PK for diferente
    .single();

  if (profErr && profErr.code !== "PGRST116") {
    console.warn("profiles query error:", profErr);
  }

  return {
    id: user.id,
    email: user.email ?? "",
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
  const supabaseAdmin = await getAdminClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as "admin" | "user";

  // Atualiza metadados do Auth
  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { name },
  });
  if (error) return { error: error.message };

  // Garante papel na tabela profiles
  const { error: profErr } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: name, role })
    .eq("id", id);
  if (profErr) return { error: profErr.message };

  revalidatePath("/admin");
  revalidatePath(`/admin/users/${id}/edit`);
  return { error: null };
}

export async function deleteUser(userId: string) {
  await checkAdminRole();
  const supabaseAdmin = await getAdminClient();

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  // opcional: limpar perfil
  // await supabaseAdmin.from("profiles").delete().eq("id", userId);

  revalidatePath("/admin");
  return { error: null };
}
