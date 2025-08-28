// src/app/(app)/groups/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Users } from "lucide-react";
export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";

type GroupRow = {
  id: string;
  name: string;
  description?: string | null;
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

  // Traz os grupos + contagem de membros por relação
  const { data: groupsRaw, error: groupsErr } = await supabaseAny
    .from("user_groups")
    .select(
      `
      id,
      name,
      description,
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
    membersCount: Array.isArray(g.user_group_members)
      ? g.user_group_members[0]?.count ?? 0
      : 0,
  }));

  return (
    <div className="p-6 space-y-4">
      {!groups.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo encontrado.
        </p>
      ) : (
        <ul className="space-y-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {groups.map((g) => (
            <li
              key={g.id}
              className="border rounded-lg p-4 space-y-2 hover:shadow-md hover:border-gray-600 cursor-pointer transition-all duration-300 ease-in-out">
              <Link href={`/groups/${g.id}`}>
                <div className="space-y-1">
                  <span className="text-lg font-semibold">{g.name}</span>
                  {g.description ? (
                    <p className="text-sm text-muted-foreground">
                      {g.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center pt-2">
                  <Badge
                    variant={"secondary"}
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
