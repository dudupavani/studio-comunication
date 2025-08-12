// src/lib/actions/admin.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (!user) {
    console.error("isPlatformAdmin: Usuário não autenticado", authError);
    return false;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error("isPlatformAdmin: erro ao buscar perfil", profileError);
    return false;
  }

  return profile.global_role === "platform_admin";
}
