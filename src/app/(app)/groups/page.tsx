// src/app/(app)/groups/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type GroupRow = { id: string; name: string; description?: string | null };

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

  // Org do usuário (esta tabela existe nos tipos, então mantemos tipado)
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

  const { data: groupsRaw, error: groupsErr } = await supabaseAny
    .from("user_groups")
    .select("id, name, description")
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
  const groups = (groupsRaw ?? []) as GroupRow[];

  return (
    <div className="p-6 space-y-4">
      {!groups.length ? (
        <p className="text-sm text-muted-foreground">
          Nenhum grupo encontrado.
        </p>
      ) : (
        <ul className="space-y-2 grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-5">
          {groups.map((g: GroupRow) => (
            <Link href={`/groups/${g.id}`}>
              <li
                key={g.id}
                className="border rounded-lg p-4 space-y-2 hover:shadow-md hover:border-gray-600 cursor-pointer transition-all duration-300 ease-in-out">
                <span className="text-lg font-semibold">{g.name}</span>
                {g.description ? (
                  <p className="text-sm text-muted-foreground">
                    {g.description}
                  </p>
                ) : null}
              </li>
            </Link>
          ))}
        </ul>
      )}
    </div>
  );
}
