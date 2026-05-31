import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";

export async function GET() {
  const auth = await getAuthContext();
  if (!auth || auth.platformRole !== "platform_admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: orgs, error } = await supabase
    .from("orgs")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Erro ao buscar organizações:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json(orgs ?? []);
}
