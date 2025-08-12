// src/app/api/admin/orgs/[orgId]/units/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { orgId: string } }
) {
  const supabase = await createClient();

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
    .eq("org_id", params.orgId)
    .order("name", { ascending: true });

  if (error) {
    console.error("List units error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
