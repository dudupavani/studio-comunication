// src/app/api/units/[unitId]/add-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUnit } from "@/lib/permissions-units";

function isUUID(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

type InsertRow = {
  org_id: string;
  unit_id: string;
  user_id: string;
};

export async function POST(
  req: Request,
  context: RouteContext<"/api/units/[unitId]/add-members">
) {
  try {
    const auth = await getAuthContext();
    if (!auth?.userId)
      return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
    if (!auth.orgId)
      return NextResponse.json({ ok: false, error: "no-org" }, { status: 400 });

    const supabase = createServiceClient();

    const unitIdParam = (await context.params).unitId;
    if (!isUUID(unitIdParam)) {
      return NextResponse.json(
        { ok: false, error: "unitId inválido" },
        { status: 400 }
      );
    }
    const unitId: string = unitIdParam;

    if (!(await canManageUnit(auth, unitId))) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
    }

    const orgId = auth.orgId;

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Body inválido" },
        { status: 400 }
      );
    }

    const userIds = (body as any).user_ids as unknown;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Parâmetros inválidos" },
        { status: 400 }
      );
    }

    // normaliza e valida os user_ids
    const validUserIds: string[] = (userIds as unknown[])
      .filter((v): v is string => typeof v === "string")
      .filter((id) => isUUID(id));

    if (validUserIds.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    // evita duplicados
    const { data: existing, error: existErr } = await supabase
      .from("unit_members")
      .select("user_id")
      .eq("unit_id", unitId)
      .in("user_id", validUserIds);

    if (existErr) {
      return NextResponse.json(
        { ok: false, error: existErr.message },
        { status: 500 }
      );
    }

    const already = new Set(
      (existing ?? []).map((r: any) => r.user_id as string)
    );
    const toInsert: InsertRow[] = validUserIds
      .filter((id) => !already.has(id))
      .map((id) => ({
        org_id: orgId,
        unit_id: unitId,
        user_id: id,
      }));

    if (toInsert.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const { error: insertErr } = await supabase
      .from("unit_members")
      .insert(toInsert, { defaultToNull: false });

    if (insertErr) {
      return NextResponse.json(
        { ok: false, error: insertErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, inserted: toInsert.length });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Erro inesperado" },
      { status: 500 }
    );
  }
}
