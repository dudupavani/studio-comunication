// src/lib/actions/admin.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlatformRole, AppRole, OrgRole, UnitRole } from "@/lib/types/roles";
import { PLATFORM_ROLES, APP_ROLES } from "@/lib/types/roles";

// Constante tipada para o papel global de plataforma
const PLATFORM_ADMIN: PlatformRole = "platform_admin";

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

  return profile.global_role === PLATFORM_ADMIN;
}
