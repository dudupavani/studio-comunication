import type { OrgUserOption } from "@/components/teams/types";
import { createServiceClient } from "@/lib/supabase/service";

type AdminMeta = {
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
  title: string | null;
};

const FALLBACK_NAME = "Sem nome";

export async function enrichOrgUsersWithAuthMetadata(
  users: OrgUserOption[]
): Promise<OrgUserOption[]> {
  const candidates = users.filter(
    (user) => !user.name || user.name === FALLBACK_NAME || !user.email
  );

  if (candidates.length === 0) return users;

  let adminClient: ReturnType<typeof createServiceClient> | null = null;
  try {
    adminClient = createServiceClient();
  } catch (err) {
    console.warn(
      "[teams] Não foi possível criar client service role para enriquecer orgUsers:",
      err
    );
    return users;
  }

  const metaMap = new Map<string, AdminMeta>();

  await Promise.all(
    candidates.map(async (user) => {
      try {
        const { data, error } = await adminClient!.auth.admin.getUserById(
          user.id
        );
        if (error || !data?.user) return;
        const authUser = data.user;
      metaMap.set(user.id, {
        name:
          (authUser.user_metadata?.name as string | null | undefined) ??
          authUser.email ??
          null,
        email: authUser.email ?? null,
        avatarUrl:
          (authUser.user_metadata?.avatar_url as string | null | undefined) ??
          null,
        title:
          (authUser.user_metadata?.title as string | null | undefined) ?? null,
      });
      } catch (error) {
        console.warn(
          "[teams] Falha ao buscar metadata do usuário",
          user.id,
          error
        );
      }
    })
  );

  if (metaMap.size === 0) return users;

  return users.map((user) => {
    const meta = metaMap.get(user.id);
    if (!meta) return user;
    return {
      ...user,
      name: meta.name ?? user.name,
      email: meta.email ?? user.email,
      avatarUrl: user.avatarUrl ?? meta.avatarUrl ?? null,
      title: user.title ?? meta.title ?? null,
    };
  });
}
