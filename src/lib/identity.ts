import { createServiceClient } from "@/lib/supabase/service";

export type ResolvedIdentity = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  title: string | null;
};

function mergeIdentity(
  current: ResolvedIdentity | undefined,
  next: Partial<ResolvedIdentity>
): ResolvedIdentity {
  return {
    full_name: next.full_name ?? current?.full_name ?? null,
    email: next.email ?? current?.email ?? null,
    avatar_url: next.avatar_url ?? current?.avatar_url ?? null,
    title: next.title ?? current?.title ?? null,
  };
}

/**
 * Resolve nomes/avatars/emails de usuários.
 * - Usa profiles como fonte primária.
 * - Completa faltantes via Admin API (auth.users).
 * - Opcionalmente inclui cargo (employee_profile) filtrando por orgId.
 */
export async function resolveIdentityMap(
  userIds: string[],
  opts?: { svc?: ReturnType<typeof createServiceClient>; orgId?: string }
): Promise<Map<string, ResolvedIdentity>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const map = new Map<string, ResolvedIdentity>();
  if (uniqueIds.length === 0) return map;

  const supabase = opts?.svc ?? createServiceClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", uniqueIds);

  if (profilesError) {
    console.warn("IDENTITY resolve profiles error:", profilesError);
  }

  (profiles ?? []).forEach((row: any) => {
    if (!row?.id) return;
    map.set(
      row.id as string,
      mergeIdentity(undefined, {
        full_name: (row.full_name as string | null) ?? null,
        avatar_url: (row.avatar_url as string | null) ?? null,
      })
    );
  });

  const missingForAdmin = uniqueIds.filter((id) => {
    const value = map.get(id);
    return !value || !value.full_name || !value.email || !value.avatar_url;
  });

  if (missingForAdmin.length) {
    await Promise.all(
      missingForAdmin.map(async (id) => {
        try {
          const { data, error } = await supabase.auth.admin.getUserById(id);
          if (error || !data?.user) return;
          const user = data.user;
          const metadata = (user.user_metadata ?? {}) as Record<string, any>;

          const name =
            (metadata?.name as string | null | undefined) ??
            user.email ??
            null;
          const avatarUrl =
            (metadata?.avatar_url as string | null | undefined) ?? null;
          const email = user.email ?? null;
          const title =
            (metadata?.title as string | null | undefined) ?? null;

          map.set(
            id,
            mergeIdentity(map.get(id), {
              full_name: name,
              email,
              avatar_url: avatarUrl,
              title,
            })
          );
        } catch (err) {
          console.warn("IDENTITY resolve admin lookup error:", err);
        }
      })
    );
  }

  try {
    let cargoQuery = supabase
      .from("employee_profile")
      .select("user_id, cargo")
      .in("user_id", uniqueIds);

    if (opts?.orgId) {
      cargoQuery = cargoQuery.eq("org_id", opts.orgId);
    }

    const { data: cargos, error: cargoError } = await cargoQuery;
    if (cargoError) {
      console.warn("IDENTITY resolve cargo lookup error:", cargoError);
    } else {
      (cargos ?? []).forEach((row: any) => {
        const id = row?.user_id as string | undefined;
        if (!id) return;
        map.set(
          id,
          mergeIdentity(map.get(id), {
            title: (row?.cargo as string | null | undefined) ?? null,
          })
        );
      });
    }
  } catch (err) {
    console.warn("IDENTITY resolve cargo failure:", err);
  }

  return map;
}
