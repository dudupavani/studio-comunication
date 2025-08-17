// src/app/api/orgs/[orgSlug]/units/[unitId]/members/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _req: Request,
  { params }: { params: { orgSlug: string; unitId: string } }
) {
  const supabase = await createClient();
  const orgId = params.orgSlug;
  const unitId = params.unitId;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // lista membros da unidade
  const { data, error } = await supabase
    .from("unit_members")
    .select("user_id, role, profiles:profiles!inner(id, full_name, email)")
    .eq("org_id", orgId)
    .eq("unit_id", unitId)
    .order("role", { ascending: true });

  if (error) {
    console.error("list unit members error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(
  req: Request,
  { params }: { params: { orgSlug: string; unitId: string } }
) {
  const supabase = await createClient();
  const orgId = params.orgSlug;
  const unitId = params.unitId;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  // espera { userId: string, role?: "unit_master" | "unit_user" }
  const { userId, role = "unit_user" } = body || {};
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  // insere vínculo
  const { error } = await supabase.from("unit_members").insert({
    org_id: orgId,
    unit_id: unitId,
    user_id: userId,
    role,
  });

  if (error) {
    console.error("add unit member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  { params }: { params: { orgSlug: string; unitId: string } }
) {
  const supabase = await createClient();
  const orgId = params.orgSlug;
  const unitId = params.unitId;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const { error } = await supabase
    .from("unit_members")
    .delete()
    .eq("org_id", orgId)
    .eq("unit_id", unitId)
    .eq("user_id", userId);

  if (error) {
    console.error("remove unit member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
