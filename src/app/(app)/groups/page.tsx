// src/app/(app)/groups/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CircleOff, Users } from "lucide-react";
export const dynamic = "force-dynamic";
import { Badge } from "@/components/ui/badge";
import GroupColorSquare from "@/components/groups/GroupColorSquare";
import NewGroupModal from "@/components/groups/new-group-modal";
import { createGroupAction } from "./actions";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

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
      <div className="p-4 sm:p-6">
        <h1>Grupos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Faça login para ver os grupos.
        </p>
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
      <div className="p-4 sm:p-6">
        <h1>Grupos</h1>
        <p className="text-sm text-red-600 mt-2">Erro ao obter organização.</p>
      </div>
    );
  }

  const orgId = orgRow?.org_id;
  if (!orgId) {
    return (
      <div className="p-4 sm:p-6">
        <h1>Grupos</h1>
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
    `,
    )
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (groupsErr) {
    return (
      <div className="p-4 sm:p-6">
        <h1>Grupos</h1>
        <p className="text-sm text-red-600 mt-2">Erro ao carregar grupos.</p>
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
      ? (g.user_group_members[0]?.count ?? 0)
      : 0,
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {groups.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleOff />
            </EmptyMedia>
            <EmptyTitle>Ainda não existem grupos</EmptyTitle>
            <EmptyDescription>
              Crie grupos de usuários para segmentar e organização as
              informações.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <NewGroupModal orgId={orgId} onSubmit={createGroupAction} />
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <section className="flex items-center justify-between gap-4">
            <div>
              <h1>Grupos</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie os grupos de usuários da sua organização.
              </p>
            </div>
            <NewGroupModal orgId={orgId} onSubmit={createGroupAction} />
          </section>
          <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-stretch gap-3 lg:gap-4">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="grid grid-cols-1 h-full content-between gap-3 rounded-lg border p-4 md:p-6 transition-all duration-300 ease-in-out hover:border-gray-600 hover:shadow-md">
                  <div className="flex flex-col gap-3">
                    <GroupColorSquare
                      color={g.color}
                      width="100%"
                      height="6px"
                    />
                    <div className="flex flex-col gap-1">
                      <span className="text-base font-semibold">{g.name}</span>
                      {g.description ? (
                        <p className="text-sm text-muted-foreground">
                          {g.description}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center">
                    <Badge
                      variant="outline"
                      className="flex items-center gap-1">
                      <Users size={14} />
                      <span>{g.membersCount}</span>
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
