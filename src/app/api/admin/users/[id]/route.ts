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
  const fallbackId = req.nextUrl.pathname.split("/").filter(Boolean).pop();
  const resolved = await context.params;
  const parsed = ParamsSchema.safeParse(
    resolved?.id ? { id: resolved.id } : { id: fallbackId }
  );
  if (!parsed.success) {
    return json(400, { ok: false, error: "Parametros invalidos." });
  }

  const targetUserId = parsed.data.id;
  const auth = await getAuthContext();
  if (!auth) return json(401, { ok: false, error: "Nao autenticado." });

  if (auth.platformRole !== "platform_admin") {
    return json(403, { ok: false, error: "Sem permissao para excluir usuario." });
  }

  const svc = createServiceClient();
  const { data: targetProfile, error: targetProfileError } = await svc
    .from("profiles")
    .select("global_role")
    .eq("id", targetUserId)
    .maybeSingle();

  if (targetProfileError) {
    return json(500, {
      ok: false,
      error: "Erro ao validar usuario alvo.",
    });
  }
  if (targetProfile?.global_role === "platform_admin") {
    return json(403, {
      ok: false,
      error: "Usuarios platform_admin nao podem ser excluidos por esta rota.",
    });
  }

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
      });
    }
  }

  const { error: authErr } = await svc.auth.admin.deleteUser(targetUserId);
  if (authErr) {
    return json(500, {
      ok: false,
      error: "Erro ao remover usuario do auth.",
    });
  }

  revalidatePath("/users");
  return json(200, { ok: true });
}
