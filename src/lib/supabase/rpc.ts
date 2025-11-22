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

  // A função SQL aceita exatamente (text, text, text)
  const { error } = await supabase.rpc("update_profile_self", {
    p_full_name: input.full_name ?? null,
    p_phone: input.phone ?? null,
    // Para "manter como está", a função trata null como "não alterar phone".
    // Para avatar usamos um sentinel específico:
    // - undefined => "__KEEP_AVATAR__" (mantém)
    // - null => remove
    // - string => novo valor
    p_avatar_url:
      typeof input.avatar_url === "undefined"
        ? AVATAR_KEEP
        : input.avatar_url,
  });

  if (error) {
    console.error("[updateProfileSelfRPC] error:", error);
    return { error: error.message };
  }
  return { error: null };
}
