import { createServiceClient } from "@/lib/supabase/service";
import type { OrgUserOption } from "@/components/teams/types";

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
