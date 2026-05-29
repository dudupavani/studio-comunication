// src/app/api/units/[unitId]/members/[userId]/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUnit } from "@/lib/permissions-units";

function isUUID(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

export async function DELETE(
  req: Request,
  context: RouteContext<"/api/units/[unitId]/members/[userId]">
) {
  try {
    const auth = await getAuthContext();
    if (!auth?.userId)
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (!auth.orgId)
      return NextResponse.json({ ok: false, error: "no-org" }, { status: 400 });

    const supabase = createServiceClient();

    const { unitId, userId } = await context.params;
    if (!isUUID(unitId) || !isUUID(userId)) {
      return NextResponse.json(
        { ok: false, error: "unitId ou userId inválido" },
        { status: 400 }
      );
    }

    if (!canManageUnit(auth, unitId)) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const orgId = auth.orgId;

    // Confirmar que a unit pertence à org do usuário autenticado
    const { data: unitRow, error: unitErr } = await supabase
      .from("units")
      .select("id, org_id")
      .eq("id", unitId)
      .maybeSingle();

    if (unitErr) {
      return NextResponse.json(
        { ok: false, error: unitErr.message },
        { status: 500 }
      );
    }
    if (!unitRow) {
      return NextResponse.json(
        { ok: false, error: "Unidade não encontrada" },
        { status: 404 }
      );
    }
    if (unitRow.org_id !== orgId) {
      return NextResponse.json(
        { ok: false, error: "Unidade não pertence à organização informada" },
        { status: 403 }
      );
    }

    // Verificar existência do vínculo
    const { data: linkRow, error: linkErr } = await supabase
      .from("unit_members")
      .select("user_id")
      .eq("org_id", orgId)
      .eq("unit_id", unitId)
      .eq("user_id", userId)
      .maybeSingle();

    if (linkErr) {
      return NextResponse.json(
        { ok: false, error: linkErr.message },
        { status: 500 }
      );
    }

    if (!linkRow) {
      // idempotente: nada para remover
      return NextResponse.json({ ok: true, removed: 0 });
    }

    // Remover vínculo
    const { error: delErr } = await supabase
      .from("unit_members")
      .delete()
      .eq("org_id", orgId)
      .eq("unit_id", unitId)
      .eq("user_id", userId);

    if (delErr) {
      return NextResponse.json(
        { ok: false, error: delErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, removed: 1 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
