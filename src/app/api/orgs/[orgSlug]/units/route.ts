// src/app/api/orgs/[orgSlug]/units/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";

export async function GET(
  _req: Request,
  context: RouteContext<"/api/orgs/[orgSlug]/units">
) {
  const auth = await getAuthContext();
  if (!auth || !canManageUsers(auth)) {
    return NextResponse.json(
      { error: "Acesso negado: apenas platform_admin ou org_admin." },
      { status: 403 }
    );
  }

  const supabase = await createClient();
  const { orgSlug } = await context.params;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      orgSlug
    );

  let orgId = orgSlug;
  if (!isUuid) {
    const { data: org, error: orgErr } = await supabase
      .from("orgs")
      .select("id")
      .eq("slug", orgSlug)
      .maybeSingle();

    if (orgErr) {
      console.error("Resolve org slug error:", orgErr);
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    if (!org?.id) {
      return NextResponse.json(
        { error: "Organização não encontrada." },
        { status: 404 }
      );
    }

    orgId = org.id;
  }

  // 1) Sessão
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Checa platform_admin (usa uid explícito)
  const { data: isAdmin, error: rpcErr } = await supabase.rpc(
    "is_platform_admin",
    { uid: user.id }
  );
  if (rpcErr) {
    console.error("is_platform_admin RPC error:", rpcErr);
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }
  if (!isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3) Lista unidades da organização
  const { data, error } = await supabase
    .from("units")
    .select("id, name")
    .eq("org_id", orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("List units error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
