// src/app/api/groups/[groupId]/members/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { toLoggableError } from "@/lib/log";
import { createServiceClient } from "@/lib/supabase/service";
import {
  parseMaybeBase64JSON,
  type SerializableSession,
} from "@/lib/auth/token-utils";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/* ========================= Schemas ========================= */

const Params = z.object({ groupId: z.string().uuid() });

const MemberInput = z.object({
  userId: z.string().uuid(),
  unitId: z.string().uuid().optional().nullable(),
});

const PostBody = z.object({
  members: z.array(MemberInput).min(1, "Inclua ao menos 1 usuário"),
});

const DeleteBody = z.object({
  userIds: z.array(z.string().uuid()).min(1, "Inclua ao menos 1 usuário"),
});

/* ============== Helpers genéricos (resolução/headers) ============== */

/**
 * Extrai o Bearer token do header Authorization.
 * Aceita:
 *  - "Bearer <jwt>"
 *  - sessão JSON base64 (com ou sem prefixo "base64-")
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader) return null;

  // Caso padrão "Bearer <jwt>"
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (m) return m[1].trim();

  // Sessão codificada (fallback)
  const raw = authHeader.startsWith("base64-")
    ? authHeader.slice("base64-".length)
    : authHeader;

  try {
    const session = parseMaybeBase64JSON<SerializableSession>(raw);
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Cria Supabase client que carrega o Authorization da requisição (para respeitar RLS)
 * Obs.: usa as variáveis públicas; não usa service_role aqui!
 */
function createClientFromAuth(req: Request) {
  const token = extractBearerToken(req);
  if (!token) {
    throw new Error("Authorization header inválido");
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase URL ou chave pública ausente");
  }
  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

/**
 * Garante que o grupo existe e retorna { id, org_id } ou null
 * Aceita qualquer client com .from() (SSR ou supabase-js)
 */
async function getGroupWithOrgId(supabase: any, groupId: string) {
  const { data, error } = await supabase
    .from("user_groups")
    .select("id, org_id")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as { id: string; org_id: string } | null;
}

/* ============================ GET ============================ */
/**
 * GET /api/groups/[groupId]/members
 * Retorna membros do grupo com dados básicos do profile (sem email)
 */
export async function GET(
  req: Request,
  context: RouteContext<"/api/groups/[groupId]/members">
) {
  try {
    const raw = await context.params;
    const { groupId } = Params.parse(raw);

    // Se veio Authorization → usa Bearer; senão → SSR (cookies)
    const supabase =
      req.headers.get("authorization") != null
        ? createClientFromAuth(req)
        : createServerClient();

    const group = await getGroupWithOrgId(supabase, groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    const { data: rows, error: mErr } = await supabase
      .from("user_group_members")
      .select("user_id, unit_id, added_at")
      .eq("group_id", group.id)
      .order("added_at", { ascending: false });

    if (mErr) throw mErr;

    const members = rows ?? [];
    if (members.length === 0) {
      return NextResponse.json({ groupId: group.id, members: [] });
    }

    const userIds = members.map((m) => m.user_id);

    const { data: profiles, error: pErr } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", userIds);

    if (pErr) throw pErr;

    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const result = members.map((m) => ({
      userId: m.user_id,
      unitId: m.unit_id,
      addedAt: m.added_at,
      profile: profileById.get(m.user_id) ?? null,
    }));

    return NextResponse.json({ groupId: group.id, members: result });
  } catch (err) {
    return NextResponse.json({ error: toLoggableError(err) }, { status: 400 });
  }
}

/* ============================ POST ============================ */
/**
 * POST /api/groups/[groupId]/members
 * Adiciona (upsert) usuários ao grupo — idempotente
 * Requer Authorization: Bearer <JWT> (para obedecer RLS)
 */
export async function POST(
  req: Request,
  context: RouteContext<"/api/groups/[groupId]/members">
) {
  try {
    const raw = await context.params;
    const { groupId } = Params.parse(raw);

    const supabase = createServiceClient();

    const body = await req.json();
    const { members } = PostBody.parse(body);

    const group = await getGroupWithOrgId(supabase, groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    const rows = members.map((m) => ({
      group_id: group.id,
      user_id: m.userId,
      unit_id: m.unitId ?? null,
      org_id: group.org_id,
    }));

    const { data, error } = await supabase
      .from("user_group_members")
      .upsert(rows, {
        onConflict: "group_id,user_id",
        ignoreDuplicates: true,
      })
      .select("user_id");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      insertedOrExisting: data?.map((d: any) => d.user_id) ?? [],
      count: data?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: toLoggableError(err) }, { status: 400 });
  }
}

/* =========================== DELETE =========================== */
/**
 * DELETE /api/groups/[groupId]/members
 * Remove usuários do grupo
 * Requer Authorization: Bearer <JWT>
 */
export async function DELETE(
  req: Request,
  context: RouteContext<"/api/groups/[groupId]/members">
) {
  try {
    const raw = await context.params;
    const { groupId } = Params.parse(raw);

    const supabase = createServiceClient();

    const body = await req.json();
    const { userIds } = DeleteBody.parse(body);

    const group = await getGroupWithOrgId(supabase, groupId);
    if (!group) {
      return NextResponse.json(
        { error: "Grupo não encontrado" },
        { status: 404 }
      );
    }

    const { data, error } = await supabase
      .from("user_group_members")
      .delete()
      .eq("group_id", group.id)
      .in("user_id", userIds)
      .select("user_id");

    if (error) throw error;

    return NextResponse.json({
      ok: true,
      removed: data?.map((d: any) => d.user_id) ?? [],
      count: data?.length ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: toLoggableError(err) }, { status: 400 });
  }
}
