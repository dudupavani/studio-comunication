// src/lib/supabase/rpc.ts
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

/**
 * Retorna true/false se o usuário informado for platform_admin.
 * (usa service client)
 */
export async function isPlatformAdminById(userId: string): Promise<boolean> {
  const svc = createServiceClient();
  const { data, error } = await svc.rpc("is_platform_admin_by_id", {
    target: userId,
  });
  if (error) {
    console.error("[isPlatformAdminById] RPC error:", error);
    return false;
  }
  return !!data;
}

/**
 * Atualiza o PRÓPRIO perfil (nome, phone, avatar_url) via RPC.
 * IMPORTANTÍSSIMO: usa o client do USUÁRIO (auth.uid() funciona na função SQL).
 * - Passe `avatar_url = null` para remover o avatar
 * - Passe `undefined` para manter o avatar como está
 */
export async function updateProfileSelfRPC(input: {
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null; // null = remover, undefined = manter
}): Promise<{ error: string | null }> {
  const supabase = createClient();
  const AVATAR_KEEP = "__KEEP_AVATAR__";

  const normalizedName =
    typeof input.full_name === "string" && input.full_name.trim().length > 0
      ? input.full_name.trim()
      : null;
  const normalizedPhone =
    typeof input.phone === "string" && input.phone.trim().length > 0
      ? input.phone.trim()
      : null;
  const avatarArg =
    typeof input.avatar_url === "undefined"
      ? AVATAR_KEEP
      : input.avatar_url ?? null;

  const { error } = await supabase.rpc("update_profile_self", {
    p_full_name: normalizedName,
    p_phone: normalizedPhone,
    p_avatar_url: avatarArg,
  });

  if (error) {
    console.error("[updateProfileSelfRPC] error:", error);
    return { error: error.message };
  }
  return { error: null };
}
