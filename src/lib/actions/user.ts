"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

export async function updateUserProfile(formData: FormData) {
  const supabase = await createClient();
  const name = formData.get("name") as string;
  const email = formData.get("email") as string | null;
  const phone = formData.get("phone") as string | null;
  const avatarFile = formData.get("avatar") as File | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be logged in to update your profile." };
  }

  let avatar_url: string | null | undefined;

  if (avatarFile && avatarFile.size > 0) {
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`${user.id}/avatar.jpg`, avatarFile, {
        upsert: true,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(uploadData.path);
    avatar_url = publicUrlData.publicUrl;
  } else if (formData.get("avatar") === "REMOVE") {
    // Remove the avatar from storage
    const { error: removeError } = await supabase.storage
      .from("avatars")
      .remove([`${user.id}/avatar.jpg`]);

    if (removeError) {
      console.error("Error removing avatar from storage:", removeError);
      // Decide how to handle this error: return it or proceed with nulling the URL
    }
    avatar_url = null; // Signal to remove avatar
  }

  const updateAuthData: {
    data: { name: string; avatar_url?: string | null };
    email?: string;
  } = {
    data: { name },
  };

  if (avatar_url !== undefined) {
    updateAuthData.data.avatar_url = avatar_url;
  }

  if (email) {
    updateAuthData.email = email;
  }

  const { error: authError } = await supabase.auth.updateUser(updateAuthData);

  if (authError) {
    return { error: authError.message };
  }

  const updateProfileData: {
    phone?: string;
    avatar_url?: string | null;
    full_name?: string;
  } = {};
  if (phone) {
    updateProfileData.phone = phone;
  }
  if (avatar_url !== undefined) {
    updateProfileData.avatar_url = avatar_url;
  }
  if (name) {
    updateProfileData.full_name = name;
  }

  if (Object.keys(updateProfileData).length > 0) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update(updateProfileData)
      .eq("id", user.id);

    if (profileError) {
      return { error: profileError.message };
    }
  }

  revalidatePath("/profile");
  return { error: null };
}

async function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function checkAdminRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authorized");
  }

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

  const userIds = usersData.users.map(u => u.id);

  const { data: profilesData, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return [];
  }

  const profilesMap = new Map(profilesData.map(p => [p.id, p]));

  return usersData.users.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: profilesMap.get(user.id)?.full_name || user.user_metadata.name || "No name",
    role: profilesMap.get(user.id)?.role || "user",
    created_at: user.created_at,
    phone: profilesMap.get(user.id)?.phone || null,
    avatar_url: profilesMap.get(user.id)?.avatar_url || null,
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
    email: profile.email || "", // Assuming email might not be directly in profiles table
    full_name: profile.full_name || "No name",
    role: profile.role || "user",
    created_at: profile.created_at,
    phone: profile.phone || null,
    avatar_url: profile.avatar_url || null,
  }));
}

export async function getUserById(id: string): Promise<Profile | null> {
  await checkAdminRole();
  const supabaseAdmin = await getAdminClient();

  const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);

  if (error) {
    console.error("Error fetching user:", error);
    return null;
  }

  const user = data.user;
  return {
    id: user.id,
    email: user.email,
    name: user.user_metadata.name || "No name",
    role: profilesMap.get(user.id)?.role || "user",
    created_at: user.created_at,
  };
}

export async function updateUser(formData: FormData) {
  await checkAdminRole();
  const supabaseAdmin = await getAdminClient();

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const role = formData.get("role") as "admin" | "user";

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, {
    user_metadata: { name, role },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/users/${id}/edit`);
  return { error: null };
}

export async function deleteUser(userId: string) {
  await checkAdminRole();
  const supabaseAdmin = await getAdminClient();

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  return { error: null };
}
