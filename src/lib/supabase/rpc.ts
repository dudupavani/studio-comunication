// src/lib/supabase/rpc.ts
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Retorna true/false se o usuário informado for platform_admin.
 * Usa uma RPC que você deve ter no banco:
 *
 * CREATE OR REPLACE FUNCTION public.is_platform_admin_by_id(target uuid)
 * RETURNS boolean
 * LANGUAGE sql
 * SECURITY DEFINER
 * AS $$
 *   SELECT EXISTS (
 *     SELECT 1 FROM public.profiles p
 *     WHERE p.id = target AND p.role = 'platform_admin'
 *   );
 * $$;
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
