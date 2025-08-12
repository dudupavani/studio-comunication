// src/app/api/orgs/[orgId]/units/[unitId]/available-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { orgId: string; unitId: string } }
) {
  try {
    const supabase = createServiceClient();

    // Busca membros da org que NÃO estão na unidade
    const { data, error } = await supabase
      .from("org_members")
      .select(
        `
        user_id,
        role,
        profiles (
          name,
          email
        )
      `
      )
      .eq("org_id", params.orgId)
      .not("user_id", "in", (subquery) =>
        subquery
          .from("unit_members")
          .select("user_id")
          .eq("unit_id", params.unitId)
      );

    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (error: any) {
    console.error("[/api/orgs/.../available-members] ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao listar membros disponíveis" },
      { status: 500 }
    );
  }
}
