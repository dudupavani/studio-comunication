import { createServiceClient } from "@/lib/supabase/service";
import type { OrgUserOption } from "@/components/teams/types";

export async function enrichOrgUsersWithUnitName(
  users: OrgUserOption[],
  orgId: string
): Promise<OrgUserOption[]> {
  try {
    const client = createServiceClient();
    const { data, error } = await client
      .from("unit_members")
      .select("user_id, unit:units!unit_members_unit_id_fkey(name)")
      .eq("org_id", orgId);

    if (error || !data) return users;

    const unitNameByUser = new Map<string, string>();
    for (const row of data) {
      if (!unitNameByUser.has(row.user_id)) {
        unitNameByUser.set(row.user_id, (row.unit as any)?.name ?? null);
      }
    }

    return users.map((u) => ({
      ...u,
      unitName: unitNameByUser.get(u.id) ?? null,
    }));
  } catch (error) {
    console.warn("[teams] Falha ao carregar unidade dos usuários", error);
    return users;
  }
}

export async function enrichOrgUsersWithEmployeeProfile(
  users: OrgUserOption[]
) {
  const missing = users.filter((user) => !user.title);
  if (!missing.length) return users;

  try {
    const client = createServiceClient();
    const { data, error } = await client
      .from("employee_profile")
      .select("user_id, cargo")
      .in(
        "user_id",
        missing.map((u) => u.id)
      );

    if (error || !data) return users;

    const titles = new Map(
      data.map((row) => [row.user_id as string, row.cargo ?? null])
    );

    return users.map((user) => ({
      ...user,
      title: user.title ?? titles.get(user.id) ?? null,
    }));
  } catch (error) {
    console.warn("[teams] Falha ao carregar cargo dos usuários", error);
    return users;
  }
}
