// src/lib/auth/safe-delete.ts
import { createServiceClient } from "@/lib/supabase/service";
import { PLATFORM_ADMIN } from "@/lib/types/roles";

/**
 * Nunca apaga um usuário platform_admin.
 * 
 * Retorna { ok: true } se deletou, { ok: false, error } caso contrário.
 */
export async function safeDeleteUser(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createServiceClient();

    // 1) Buscar profile para checar role
    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("id, role, global_role")
      .eq("id", userId)
      .single();

    // Se houve erro ao ler, não prossegue com deleção cega
    if (pErr) {
      return { ok: false, error: `Não foi possível ler profile do usuário: ${pErr.message}` };
    }

    // 2) Blindagem: se for platform_admin em qualquer campo, nunca deleta
    if (profile?.role === PLATFORM_ADMIN || profile?.global_role === PLATFORM_ADMIN) {
      return { ok: false, error: "Usuário com role=platform_admin não pode ser deletado por automação." };
    }

    // 3) Deletar usuário no auth
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return { ok: false, error: `Falha ao deletar usuário: ${delErr.message}` };

    // 4) (Opcional) Também remover linhas auxiliares ligadas ao usuário (org_members, unit_members)
    // Faça isso apenas se sua lógica de negócio exigir limpeza em cascata manual.
    // Exemplo (ajuste se necessário):
    await admin.from("org_members").delete().eq("user_id", userId);
    await admin.from("unit_members").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);

    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Erro inesperado em safeDeleteUser." };
  }
}