import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { orgId: string; unitId: string } }
) {
  const supabase = await createClient();
  const q = new URL(req.url).searchParams.get("q") ?? "";

  // 1. Quem já está na unidade
  const { data: members } = await supabase
    .from("unit_members")
    .select("user_id")
    .eq("unit_id", params.unitId);

  const alreadyInUnit = new Set((members ?? []).map((m) => m.user_id));

  // 2. Todos usuários da org
  const { data, error } = await supabase
    .from("org_members")
    .select(
      "user_id, profiles:profiles!org_members_user_id_fkey(email, full_name)"
    )
    .eq("org_id", params.orgId);

  if (error) {
    console.error("Erro ao buscar usuários:", error);
    return NextResponse.json([], { status: 500 });
  }

  // 3. Filtra: não está na unidade e bate com a busca
  const result = (data ?? [])
    .filter((row) => !alreadyInUnit.has(row.user_id))
    .filter((row) => {
      if (!q) return true;
      const text =
        (row.profiles?.email ?? "") + (row.profiles?.full_name ?? "");
      return text.toLowerCase().includes(q.toLowerCase());
    })
    .map((row) => ({
      user_id: row.user_id,
      email: row.profiles?.email ?? "",
      name: row.profiles?.full_name ?? "",
    }))
    .slice(0, 10); // limita resultados

  return NextResponse.json(result);
}
