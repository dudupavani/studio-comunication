// src/app/api/orgs/[orgSlug]/units/[unitId]/search-users/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { orgSlug: string; unitId: string } }
) {
  const supabase = await createClient();
  const orgId = params.orgSlug;
  const unitId = params.unitId;

  // sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // query param ?q=
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  // exemplo: buscar usuários da org não vinculados a esta unit
  // ajuste conforme sua estrutura de tabelas
  const { data, error } = await supabase
    .from("org_members")
    .select("user_id, profiles:profiles!inner(id, full_name, email)")
    .eq("org_id", orgId)
    // filtro adicional por q (nome/email) se houver
    .ilike("profiles.full_name", q ? `%${q}%` : "%");

  if (error) {
    console.error("search-users error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // você pode pós-filtrar removendo os já membros da unit, se necessário
  return NextResponse.json(data ?? []);
}
