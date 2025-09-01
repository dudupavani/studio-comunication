// src/app/api/units/[unitId]/available-members/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// Torna-se um type predicate para o TS estreitar para string
function isUUID(v: unknown): v is string {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

// Busca e-mails no auth.users via Admin API em lotes
async function fetchEmailsByUserIds(
  supabase: ReturnType<typeof createServiceClient>,
  userIds: string[]
): Promise<Map<string, string | null>> {
  const emailById = new Map<string, string | null>();
  const ids = Array.from(new Set(userIds)); // unique
  const chunkSize = 25;

  for (let i = 0; i < ids.length; i += chunkSize) {
    const slice = ids.slice(i, i + chunkSize);
    await Promise.all(
      slice.map(async (id) => {
        try {
          const res = await supabase.auth.admin.getUserById(id);
          const email = res?.data?.user?.email ?? null;
          emailById.set(id, email);
        } catch {
          // Se falhar para um usuário, seguimos com null
          emailById.set(id, null);
        }
      })
    );
  }

  return emailById;
}

export async function GET(req: Request, ctx: { params: { unitId?: string } }) {
  try {
    const supabase = createServiceClient();

    // params
    const unitId = ctx?.params?.unitId;
    if (!isUUID(unitId)) {
      return NextResponse.json(
        { ok: false, error: "unitId inválido" },
        { status: 400 }
      );
    }

    // query
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get("org_id");
    if (!isUUID(orgId)) {
      return NextResponse.json(
        { ok: false, error: "org_id é obrigatório" },
        { status: 400 }
      );
    }

    // usuários já vinculados na unidade
    const { data: existingRows, error: existingErr } = await supabase
      .from("unit_members")
      .select("user_id")
      .eq("unit_id", unitId);

    if (existingErr) {
      return NextResponse.json(
        { ok: false, error: existingErr.message },
        { status: 500 }
      );
    }

    const alreadyIds = new Set(
      (existingRows ?? []).map((r) => r.user_id as string)
    );

    // membros da organização (com nome em profiles)
    const { data: orgUsers, error: orgErr } = await supabase
      .from("org_members")
      .select("user_id, profiles!inner(full_name)")
      .eq("org_id", orgId);

    if (orgErr) {
      return NextResponse.json(
        { ok: false, error: orgErr.message },
        { status: 500 }
      );
    }

    // Candidatos: quem pertence à org e ainda NÃO está na unidade
    const baseUsers =
      (orgUsers ?? [])
        .map((r: any) => ({
          id: r.user_id as string,
          name: (r.profiles?.full_name as string | null) ?? null,
          email: null as string | null, // será preenchido abaixo
        }))
        .filter((u) => !alreadyIds.has(u.id)) ?? [];

    if (baseUsers.length === 0) {
      return NextResponse.json({ ok: true, users: [] });
    }

    // Enriquecer com e-mails (auth.users via Admin API)
    const emailMap = await fetchEmailsByUserIds(
      supabase,
      baseUsers.map((u) => u.id)
    );

    const users = baseUsers
      .map((u) => ({
        ...u,
        email: emailMap.get(u.id) ?? null,
      }))
      // ordenação simples por nome (opcional)
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "pt-BR"));

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
