// src/app/(app)/groups/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";

export const dynamic = "force-dynamic";

type Props = { params: { groupId: string } };

function roleLabel(role?: string | null) {
  switch (role) {
    case "platform_admin":
      return "Platform Admin";
    case "org_admin":
      return "Org Admin";
    case "org_master":
      return "Org Master";
    case "unit_master":
      return "Unit Master";
    case "unit_user":
      return "Unit User";
    default:
      return null;
  }
}

export default async function GroupPage({ params }: Props) {
  const supabase = createClient();

  // Sessão
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id ?? null;

  // Grupo
  const { data: group } = await supabase
    .from("user_groups")
    .select("id, org_id, name, description, color, created_at")
    .eq("id", params.groupId)
    .single();

  // Membership do usuário
  const { data: membership } = await supabase
    .from("user_group_members")
    .select("group_id, user_id, org_id, unit_id, added_at")
    .eq("group_id", params.groupId)
    .eq("user_id", userId!)
    .maybeSingle();

  // Contagem
  const { count: membersCount } = await supabase
    .from("user_group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", params.groupId);

  // Lista de membros (IDs)
  const { data: membersRows } = await supabase
    .from("user_group_members")
    .select("user_id, unit_id, added_at")
    .eq("group_id", params.groupId)
    .order("added_at", { ascending: true });

  const userIds = (membersRows ?? []).map((r) => r.user_id);

  // Perfis
  let profilesMap: Record<
    string,
    {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      phone: string | null;
    }
  > = {};
  if (userIds.length > 0) {
    const { data: profilesRows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, phone")
      .in("id", userIds);
    if (profilesRows)
      profilesMap = Object.fromEntries(profilesRows.map((p) => [p.id, p]));
  }

  // Roles (org_members)
  let rolesMap: Record<string, string> = {};
  if (userIds.length > 0 && group?.org_id) {
    const { data: orgMembersRows } = await supabase
      .from("org_members")
      .select("user_id, role")
      .in("user_id", userIds)
      .eq("org_id", group.org_id);
    if (orgMembersRows)
      rolesMap = Object.fromEntries(
        orgMembersRows.map((o) => [o.user_id, o.role])
      );
  }

  // Enriquecido
  const members = (membersRows ?? []).map((m) => ({
    ...m,
    profile: profilesMap[m.user_id] ?? null,
    role: rolesMap[m.user_id] ?? null,
  }));

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">{group?.name ?? "Grupo"}</h1>
      <p className="text-muted-foreground !mt-3">
        {group?.description ?? "Sem descrição"} • {membersCount ?? 0} membro(s)
      </p>

      <section>
        <h2 className="text-lg font-semibold mb-3">Membros</h2>
        <ul className="space-y-3">
          {members.map((m) => {
            const label = roleLabel(m.role);
            return (
              <li
                key={m.user_id}
                className="flex items-center gap-3 border rounded-lg p-3">
                {m.profile?.avatar_url ? (
                  <Image
                    src={m.profile.avatar_url}
                    alt={m.profile.full_name ?? "Avatar"}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300" />
                )}
                <div>
                  <p className="font-medium">
                    {m.profile?.full_name ?? "Sem nome"}
                    {label ? (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-200">
                        {label}
                      </span>
                    ) : null}
                  </p>
                  {(m.profile?.phone ?? "").trim() ? (
                    <p className="text-sm text-muted-foreground">
                      {m.profile?.phone}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {!group && <p>Grupo não encontrado ou sem permissão.</p>}
      {group && !membership && (
        <p className="text-red-600">
          Você não é membro deste grupo (ou não há linha em user_group_members).
        </p>
      )}
    </main>
  );
}
