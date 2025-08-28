// src/app/(app)/groups/[groupId]/page.tsx
import { createClient } from "@/lib/supabase/server";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Group } from "lucide-react";
import EmailCopy from "@/components/EmailCopy"; // ✅ botão copiar e-mail

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

  // Membership do usuário — SOMENTE se tiver userId (ajuste mínimo/seguro)
  let membership: {
    group_id: string;
    user_id: string;
    org_id: string;
    unit_id: string | null;
    added_at: string;
  } | null = null;

  if (userId) {
    const { data: m } = await supabase
      .from("user_group_members")
      .select("group_id, user_id, org_id, unit_id, added_at")
      .eq("group_id", params.groupId)
      .eq("user_id", userId)
      .maybeSingle();
    membership = m ?? null;
  }

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

  // Perfis (nome/avatar)
  let profilesMap: Record<
    string,
    {
      id: string;
      full_name: string | null;
      avatar_url: string | null;
      phone: string | null; // mantido por compat; não será exibido
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

  // ✅ Identidades (email vem de auth.users, via RPC segura)
  type IdentityRow = {
    user_id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    org_id: string;
  };
  let identityById: Record<string, IdentityRow> = {};

  if (userIds.length > 0) {
    // ← sem genéricos no rpc() para evitar o erro de “2 argumentos de tipo”
    const { data: identities, error: idErr } = await supabase.rpc(
      "get_user_identity_many",
      { p_user_ids: userIds }
    );

    if (!idErr && Array.isArray(identities)) {
      const rows = identities as IdentityRow[];
      identityById = Object.fromEntries(rows.map((r) => [r.user_id, r]));
    }
  }

  // Enriquecido
  const members = (membersRows ?? []).map((m) => ({
    ...m,
    profile: profilesMap[m.user_id] ?? null,
    role: rolesMap[m.user_id] ?? null,
    identity: identityById[m.user_id] ?? null, // ✅ contém email
  }));

  return (
    <main className="p-6 flex flex-col">
      <div className="flex  gap-4 mb-8 mt-2">
        <div>
          <Group size={28} />
        </div>
        <div>
          <h1 className="text-xl font-bold">{group?.name ?? "Grupo"}</h1>
          <p className="text-sm text-muted-foreground">
            {group?.description ?? "Sem descrição"}
          </p>
        </div>
      </div>

      <section className="border border-gray-200 bg-muted rounded-lg p-4 ">
        <h2 className="text-2xl font-bold mb-4">
          Membros{" "}
          <span className="font-light text-muted-foreground">
            ({membersCount ?? 0})
          </span>
        </h2>
        <ul className="space-y-3">
          {members.map((m) => {
            const label = roleLabel(m.role);
            const fullName =
              m.identity?.full_name ?? m.profile?.full_name ?? "Sem nome";
            const email = m.identity?.email ?? null;

            return (
              <li
                key={m.user_id}
                className="flex items-center justify-between gap-3 border rounded-lg py-3 px-4 bg-white">
                <div className="flex items-center gap-3 ">
                  <div>
                    {m.profile?.avatar_url ? (
                      <Image
                        src={m.profile.avatar_url}
                        alt={fullName}
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300" />
                    )}
                  </div>

                  <div>
                    <p className="font-semibold">{fullName}</p>
                    {email ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>{email}</span>
                        <span>
                          {email ? <EmailCopy email={email} /> : null}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {label ? <Badge variant={"secondary"}>{label}</Badge> : null}
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
