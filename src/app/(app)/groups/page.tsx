// src/app/(app)/groups/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import GroupColorSquare from "@/components/groups/GroupColorSquare";
import NewGroupModal from "@/components/groups/new-group-modal";
import { createGroupAction } from "./actions";
import { CircleOff } from "lucide-react";

type GroupRow = {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  membersCount: number;
};

export default async function GroupsPage() {
  const supabase = createClient();

  // Sessão
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Grupos</h1>
        <p className="text-sm mt-3">Faça login para ver os grupos.</p>
      </div>
    );
  }

  // Org do usuário
  const { data: orgRow, error: orgErr } = await supabase
    .from("org_members")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (orgErr) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Grupos</h1>
        <p className="text-sm text-red-600 mt-2">Erro ao obter organização.</p>
        <pre className="text-xs mt-3">{orgErr.message}</pre>
      </div>
    );
  }

  const orgId = orgRow?.org_id;
  if (!orgId) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Grupos</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Sua conta não está vinculada a nenhuma organização.
        </p>
      </div>
    );
  }

  // ⚠️ Cast local para destravar tipos enquanto não regeneramos o Database
  const supabaseAny = supabase as any;

  // Traz os grupos + contagem de membros + cor
  const { data: groupsRaw, error: groupsErr } = await supabaseAny
    .from("user_groups")
    .select(
      `
      id,
      name,
      description,
      color,
      user_group_members(count)
    `
    )
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (groupsErr) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Grupos</h1>
        <p className="text-sm text-red-600 mt-2">Erro ao carregar grupos.</p>
        <pre className="text-xs mt-3">{groupsErr.message}</pre>
      </div>
    );
  }

  // Normaliza para o tipo esperado da UI
  const groups: GroupRow[] = (groupsRaw ?? []).map((g: any) => ({
    id: g.id,
    name: g.name,
    description: g.description ?? null,
    color: g.color ?? null,
    membersCount: Array.isArray(g.user_group_members)
      ? g.user_group_members[0]?.count ?? 0
      : 0,
  }));

  return (
    <div className="p-6 space-y-4">
      {/* botão novo grupo de usuários */}
      <div>
        <div className="flex items-center justify-end">
          {/* Passamos o orgId do usuário */}
          <NewGroupModal orgId={orgId} onSubmit={createGroupAction} />
        </div>

        {!groups.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhum grupo encontrado.
          </p>
        ) : (
          <ul className="space-y-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {/* ...lista de grupos */}
          </ul>
        )}
      </div>

      {!groups.length ? (
        <div className="flex flex-col w-full justify-center items-center gap-4">
          <div className="flex items-center justify-center text-muted-foreground bg-white border border-gray-100 shadow-lg rounded-lg w-12 h-12">
            <CircleOff size={24} />
          </div>
          <span className="text-sm text-muted-foreground">
            Nenhum grupo encontrado.
          </span>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-stretch gap-2 lg:gap-4">
          {groups.map((g) => (
            <li key={g.id}>
              <Link
                href={`/groups/${g.id}`}
                className="grid grid-cols-1 gap-2 p-6 items-stretch flex-col h-full content-between border rounded-lg hover:shadow-md hover:border-gray-600 cursor-pointer transition-all duration-300 ease-in-out">
                <div className="flex flex-col gap-3">
                  <GroupColorSquare color={g.color} width="100%" height="6px" />
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg/6 font-semibold">{g.name}</span>
                    </div>
                    {g.description ? (
                      <p className="text-sm text-muted-foreground">
                        {g.description}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center mt-2">
                  <Badge
                    variant={"outline"}
                    className="flex items-center gap-1">
                    <Users size={14} />
                    <span>{g.membersCount}</span>
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
