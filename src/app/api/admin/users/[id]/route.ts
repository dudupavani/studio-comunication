// Hard delete de usuário (somente platform_admin ou org_admin da mesma org)
import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthContext } from "@/lib/auth-context";
import type { Database } from "@/lib/supabase/types";

const ParamsSchema = z.object({ id: z.string().uuid() });

function json(status: number, payload: Record<string, unknown>) {
  return NextResponse.json(payload, { status });
}

export async function DELETE(
  req: NextRequest,
  context: RouteContext<"/api/admin/users/[id]">
) {
  // Em algumas configurações o params pode vir vazio; extraímos do pathname como fallback.
  const fallbackId = req.nextUrl.pathname.split("/").filter(Boolean).pop();
  const resolved = await context.params;
  const parsed = ParamsSchema.safeParse(
    resolved?.id ? { id: resolved.id } : { id: fallbackId }
  );
  if (!parsed.success) {
    return json(400, { ok: false, error: "Parâmetros inválidos." });
  }

  const targetUserId = parsed.data.id;
  const auth = await getAuthContext();
  if (!auth) return json(401, { ok: false, error: "Não autenticado." });

  const isPlatform = auth.platformRole === "platform_admin";
  const isOrgAdmin = auth.orgRole === "org_admin" && !!auth.orgId;
  if (!isPlatform && !isOrgAdmin) {
    return json(403, { ok: false, error: "Sem permissão para excluir usuário." });
  }

  const svc = createServiceClient();

  // Se for org_admin, o alvo precisa pertencer à mesma organização
  if (isOrgAdmin && auth.orgId) {
    const { data: membership, error: membershipErr } = await svc
      .from("org_members")
      .select("org_id")
      .eq("org_id", auth.orgId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (membershipErr) {
      return json(500, {
        ok: false,
        error: "Erro ao validar organização do usuário.",
        details: membershipErr.message,
      });
    }
    if (!membership) {
      return json(403, {
        ok: false,
        error: "Usuário não pertence à sua organização.",
      });
    }
  }

  // Limpa vínculos antes de apagar do auth.users para evitar FKs sem cascade.
  const cleanupTables: Array<{
    table: keyof Pick<
      Database["public"]["Tables"],
      | "user_group_members"
      | "unit_members"
      | "equipe_members"
      | "employee_profile"
      | "org_members"
      | "notifications"
    >;
    column: string;
  }> = [
    { table: "user_group_members", column: "user_id" },
    { table: "unit_members", column: "user_id" },
    { table: "equipe_members", column: "user_id" },
    { table: "employee_profile", column: "user_id" },
    { table: "org_members", column: "user_id" },
    { table: "notifications", column: "user_id" },
  ];

  for (const { table, column } of cleanupTables) {
    const { error } = await svc.from(table).delete().eq(column, targetUserId);
    if (error) {
      return json(500, {
        ok: false,
        error: `Erro ao limpar dados em ${table}.`,
        details: error.message,
      });
    }
  }

  // Remove do auth.users via service role
  const { error: authErr } = await svc.auth.admin.deleteUser(targetUserId);
  if (authErr) {
    return json(500, {
      ok: false,
      error: "Erro ao remover usuário do auth.",
      details: authErr.message,
    });
  }

  // Atualiza listagens
  revalidatePath("/users");
  return json(200, { ok: true });
}
