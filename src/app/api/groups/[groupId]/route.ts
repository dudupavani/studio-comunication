// src/app/api/groups/[groupId]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toLoggableError } from "@/lib/log";

export const dynamic = "force-dynamic";

// ============ Helpers ============
function jsonError(status: number, message: string, extra?: unknown) {
  return NextResponse.json({ error: message, details: extra }, { status });
}

function norm(v: unknown) {
  if (v === undefined) return undefined;
  if (v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  return v;
}

const ParamsSchema = z.object({ groupId: z.string().uuid() });

// ============ GET /api/groups/:groupId ============
export async function GET(
  _req: Request,
  context: RouteContext<"/api/groups/[groupId]">
) {
  try {
    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return jsonError(400, "Parâmetros inválidos", parsed.error.flatten());
    }
    const { groupId } = parsed.data;

    const supabase = await createClient();

    const { data: group, error } = await supabase
      .from("user_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (error?.code === "PGRST116" || (!group && !error)) {
      return jsonError(404, "Grupo não encontrado");
    }
    if (error) {
      return jsonError(500, "Erro ao buscar grupo", toLoggableError(error));
    }

    const { count: membersCount } = await supabase
      .from("user_group_members")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId);

    return NextResponse.json(
      { item: group, membersCount: membersCount ?? 0 },
      { status: 200 }
    );
  } catch (e) {
    return jsonError(500, "Erro inesperado ao obter grupo", toLoggableError(e));
  }
}

// ============ PATCH /api/groups/:groupId ============
export async function PATCH(
  req: Request,
  context: RouteContext<"/api/groups/[groupId]">
) {
  try {
    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return jsonError(400, "Parâmetros inválidos", parsed.error.flatten());
    }
    const { groupId } = parsed.data;

    // body tolerante
    let bodyRaw: any = {};
    try {
      bodyRaw = await req.json();
    } catch {
      bodyRaw = {};
    }

    const BodySchema = z.object({
      name: z.string().optional().nullable(),
      description: z.string().optional().nullable(),
      color: z.string().optional().nullable(),
      orgId: z.string().uuid().optional(),
    });

    const parsedBody = BodySchema.safeParse(bodyRaw);
    if (!parsedBody.success) {
      return jsonError(422, "Body inválido", {
        issues: parsedBody.error.flatten(),
        received: bodyRaw,
      });
    }

    const { name, description, color, orgId } = parsedBody.data;
    const patch: Record<string, unknown> = {};
    if (typeof name !== "undefined") patch.name = norm(name);
    if (typeof description !== "undefined")
      patch.description = norm(description);
    if (typeof color !== "undefined") patch.color = norm(color);

    const supabase = await createClient();

    // confirma que existe
    const { data: existing, error: getErr } = await supabase
      .from("user_groups")
      .select("*")
      .eq("id", groupId)
      .single();

    if (getErr?.code === "PGRST116" || (!existing && !getErr)) {
      return jsonError(404, "Grupo não encontrado");
    }
    if (getErr) {
      return jsonError(500, "Erro ao buscar grupo", toLoggableError(getErr));
    }

    // (opcional) reforço de escopo
    if (orgId && existing.org_id && orgId !== existing.org_id) {
      return jsonError(403, "OrgId incompatível com o grupo");
    }

    // nada para atualizar? devolve o atual
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ item: existing }, { status: 200 });
    }

    // update
    const { data: updated, error: updErr } = await supabase
      .from("user_groups")
      .update(patch)
      .eq("id", groupId)
      .select("*")
      .single();

    if (updErr?.code === "PGRST116" || (!updated && !updErr)) {
      return jsonError(404, "Grupo não encontrado (após update)");
    }
    if (updErr) {
      return jsonError(500, "Erro ao atualizar grupo", toLoggableError(updErr));
    }

    return NextResponse.json({ item: updated }, { status: 200 });
  } catch (e) {
    return jsonError(
      500,
      "Erro inesperado ao atualizar grupo",
      toLoggableError(e)
    );
  }
}

// ============ DELETE /api/groups/:groupId ============
export async function DELETE(
  _req: Request,
  context: RouteContext<"/api/groups/[groupId]">
) {
  try {
    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return jsonError(400, "Parâmetros inválidos", parsed.error.flatten());
    }
    const { groupId } = parsed.data;

    const supabase = await createClient();
    const { error } = await supabase
      .from("user_groups")
      .delete()
      .eq("id", groupId);

    if (error?.code === "PGRST116") {
      return jsonError(404, "Grupo não encontrado");
    }
    if (error) {
      return jsonError(500, "Erro ao deletar grupo", toLoggableError(error));
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    return jsonError(
      500,
      "Erro inesperado ao deletar grupo",
      toLoggableError(e)
    );
  }
}
