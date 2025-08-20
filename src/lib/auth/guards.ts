// src/lib/auth/guards.ts
import { createClient } from "@/lib/supabase/server";
import { PLATFORM_ADMIN } from "@/lib/types/roles";

/** Checagem única e reutilizável */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // checa profiles.role e profiles.global_role (fallback), como você já fazia
  const { data: p1 } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (p1?.role === PLATFORM_ADMIN) return true;

  const { data: p2 } = await supabase
    .from("profiles")
    .select("global_role")
    .eq("id", user.id)
    .single();

  return p2?.global_role === PLATFORM_ADMIN;
}