// src/app/api/units/[unitId]/add-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  req: Request,
  { params }: { params: { unitId: string } }
) {
  const { org_id, user_ids } = await req.json();

  if (!org_id || !user_ids || !Array.isArray(user_ids)) {
    return NextResponse.json(
      { ok: false, error: "Parâmetros inválidos" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const rows = user_ids.map((userId) => ({
    org_id,
    unit_id: params.unitId,
    user_id: userId,
    role: "unit_user",
  }));

  const { error } = await supabase.from("unit_members").insert(rows);

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
