import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { createServiceClient } from "@/lib/supabase/service";
import { toLoggableError } from "@/lib/log";

const ParamsSchema = z.object({ id: z.string().uuid() });

const BodySchema = z.object({
  cargo: z.string().max(200).optional().nullable(),
  dataEntrada: z
    .string()
    .optional()
    .nullable()
    .refine(
      (value) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value),
      "Data inválida (use o formato AAAA-MM-DD)."
    ),
});

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ ok: false, error: message, details }, { status });
}

async function resolveParams<T = any>(ctx: unknown): Promise<T> {
  const resolved = await Promise.resolve(ctx as any);
  return (resolved?.params ?? resolved) as T;
}

export async function PUT(
  req: Request,
  ctx: { params: { id: string } } | Promise<{ params: { id: string } }>
) {
  try {
    const auth = await getAuthContext();
    if (!auth) {
      return jsonError(401, "É preciso estar autenticado.");
    }
    if (!canManageUsers(auth)) {
      return jsonError(403, "Apenas gestores podem atualizar colaboradores.");
    }
    if (!auth.orgId) {
      return jsonError(400, "Organização ativa não encontrada para o usuário.");
    }

    const rawParams = await resolveParams<{ id: string }>(ctx);
    const parsedParams = ParamsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return jsonError(400, "Parâmetros inválidos.", parsedParams.error.flatten());
    }

    let body: unknown = null;
    try {
      body = await req.json();
    } catch {
      /* corpo vazio */
    }
    const parsedBody = BodySchema.safeParse(body ?? {});
    if (!parsedBody.success) {
      return jsonError(422, "Dados inválidos.", parsedBody.error.flatten());
    }

    const targetUserId = parsedParams.data.id;
    const orgId = auth.orgId;
  const normalizedCargo = parsedBody.data.cargo?.trim() || null;
  const normalizedDate = parsedBody.data.dataEntrada || null;

  const supabase = createServiceClient();

    const { data: membership, error: membershipErr } = await supabase
      .from("org_members")
      .select("role")
      .eq("org_id", orgId)
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (membershipErr) {
      return jsonError(
        500,
        "Erro ao validar participação do colaborador.",
        toLoggableError(membershipErr)
      );
    }
    if (!membership) {
      return jsonError(404, "Colaborador não encontrado nesta organização.");
    }

    const { data: upserted, error: upsertErr } = await supabase
      .from("employee_profile")
      .upsert(
        {
          org_id: orgId,
          user_id: targetUserId,
          cargo: normalizedCargo,
          data_entrada: normalizedDate,
        },
        { onConflict: "org_id,user_id" }
      )
      .select("cargo, data_entrada, time_principal_id")
      .single();

    if (upsertErr) {
      return jsonError(
        500,
        "Erro ao salvar dados corporativos.",
        toLoggableError(upsertErr)
      );
    }

    revalidatePath(`/users/${targetUserId}/edit`);

    return NextResponse.json({
      ok: true,
      employeeProfile: upserted,
    });
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao atualizar dados corporativos.",
      toLoggableError(error)
    );
  }
}
