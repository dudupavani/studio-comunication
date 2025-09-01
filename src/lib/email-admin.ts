// src/lib/email-admin.ts

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Busca e-mails no `auth.users` (Supabase Admin API) para uma lista de userIds.
 *
 * - Deduplica `userIds`
 * - Faz chunk em lotes (padrão: 25) e busca cada id com `getUserById`
 * - Em erro individual, armazena `null` e continua (não falha o lote)
 * - Retorna `Map<userId, email|null>`
 *
 * Uso típico:
 *   const emailMap = await fetchEmailsByUserIds(supabase, ids);
 *   const email = emailMap.get(userId) ?? null;
 */
export async function fetchEmailsByUserIds(
  supabase: ReturnType<typeof createServiceClient>,
  userIds: string[],
  opts?: { chunkSize?: number }
): Promise<Map<string, string | null>> {
  const emailById = new Map<string, string | null>();
  if (!Array.isArray(userIds) || userIds.length === 0) return emailById;

  // Deduplica e normaliza
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  const chunkSize = Math.max(1, opts?.chunkSize ?? 25);

  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    await Promise.all(
      slice.map(async (id) => {
        try {
          const res = await supabase.auth.admin.getUserById(id);
          const email = res?.data?.user?.email ?? null;
          emailById.set(id, email);
        } catch {
          // Se falhar para um usuário, seguimos com null
          emailById.set(id, null);
        }
      })
    );
  }

  return emailById;
}

/**
 * Conveniência: busca e-mail de um único usuário.
 */
export async function fetchEmailForUserId(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<string | null> {
  if (!userId) return null;
  const map = await fetchEmailsByUserIds(supabase, [userId]);
  return map.get(userId) ?? null;
}
