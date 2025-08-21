import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth || !canManageUsers(auth)) {
    return NextResponse.json(
      { error: "Acesso negado: apenas platform_admin ou org_admin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();

  // 1) Usuário logado
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Checa se é platform_admin
  const { data: isAdmin, error: rpcErr } = await supabase.rpc(
    "is_platform_admin",
    { uid: user.id } // usa UID explícito
  );

  if (rpcErr) {
    console.error("Erro RPC is_platform_admin:", rpcErr);
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) Lista todas as organizações (policy no Supabase precisa liberar para platform_admin)
  const { data: orgs, error } = await supabase
    .from("orgs")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar organizações:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(orgs ?? []);
}