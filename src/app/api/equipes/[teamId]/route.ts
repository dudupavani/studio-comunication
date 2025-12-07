// src/app/api/equipes/[teamId]/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext, type AuthContext } from "@/lib/auth-context";
import {
  createClient,
  createServerClientWithCookies,
} from "@/lib/supabase/server";
import { toLoggableError } from "@/lib/log";

const TEAM_MANAGER_ROLES = new Set([
  "org_admin",
  "org_master",
  "unit_master",
]);

function jsonError(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

function canManageTeams(auth: AuthContext | null) {
  if (!auth) return false;
  if (auth.platformRole === "platform_admin") return true;
  return auth.orgRole ? TEAM_MANAGER_ROLES.has(auth.orgRole) : false;
}

async function getTeamContext() {
  const auth = await getAuthContext();
  if (!auth) {
    return {
      error: jsonError(401, "É preciso estar autenticado para acessar equipes."),
    };
  }
  if (!canManageTeams(auth)) {
    return { error: jsonError(403, "Acesso negado para equipes.") };
  }
  if (!auth.orgId) {
    return {
      error: jsonError(
        400,
        "Não foi possível determinar a organização ativa do usuário."
      ),
    };
  }

  return { auth, orgId: auth.orgId };
}

const ParamsSchema = z.object({ teamId: z.string().uuid() });

const UpdateSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  leader: z.string().uuid("Líder inválido"),
  members: z
    .array(z.string().uuid("ID de usuário inválido"))
    .min(1, "Selecione ao menos um membro"),
});

export async function GET(
  _req: Request,
  context: RouteContext<"/api/equipes/[teamId]">
) {
  try {
    const scope = await getTeamContext();
    if ("error" in scope) return scope.error;
    const { orgId } = scope;

    const parsed = ParamsSchema.safeParse(await context.params);
    if (!parsed.success) {
      return jsonError(400, "Parâmetros inválidos.", parsed.error.flatten());
    }
    const { teamId } = parsed.data;

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("equipes")
      .select(
        `
        id,
        name,
        leader_user_id,
        leader:profiles!equipes_leader_user_id_fkey (
          id,
          full_name,
          avatar_url
        ),
        equipe_members (
          user_id
        )
      `
      )
      .eq("org_id", orgId)
      .eq("id", teamId)
      .maybeSingle();

    if (error?.code === "PGRST116") {
      return jsonError(404, "Equipe não encontrada.");
    }
    if (error) {
      return jsonError(
        500,
        "Erro ao carregar equipe.",
        toLoggableError(error)
      );
    }
    if (!data) {
      return jsonError(404, "Equipe não encontrada.");
    }

    const members = Array.isArray(data.equipe_members)
      ? data.equipe_members.map((member: any) => member.user_id as string)
      : [];

    return NextResponse.json({
      item: {
        id: data.id,
        name: data.name,
        leader: data.leader_user_id,
        leaderProfile: data.leader
          ? {
              id: data.leader.id,
              fullName: data.leader.full_name,
              avatarUrl: data.leader.avatar_url,
            }
          : null,
        members,
      },
    });
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao obter equipe.",
      toLoggableError(error)
    );
  }
}

export async function PUT(
  req: Request,
  context: RouteContext<"/api/equipes/[teamId]">
) {
  try {
    const scope = await getTeamContext();
    if ("error" in scope) return scope.error;
    const { auth, orgId } = scope;

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(
        400,
        "Parâmetros inválidos.",
        parsedParams.error.flatten()
      );
    }
    const { teamId } = parsedParams.data;

    let bodyRaw: unknown = {};
    try {
      bodyRaw = await req.json();
    } catch {
      /* corpo vazio */
    }

    const parsedBody = UpdateSchema.safeParse(bodyRaw);
    if (!parsedBody.success) {
      return jsonError(422, "Dados inválidos.", parsedBody.error.flatten());
    }

    const payload = parsedBody.data;
    const trimmedName = payload.name.trim();
    const desiredMembers = Array.from(new Set(payload.members));

    if (!trimmedName) {
      return jsonError(400, "Nome da equipe é obrigatório.");
    }
    if (!desiredMembers.length) {
      return jsonError(400, "Selecione ao menos um membro.");
    }
    if (!desiredMembers.includes(payload.leader)) {
      return jsonError(
        400,
        "O líder precisa estar entre os membros selecionados."
      );
    }

    const supabase = createServerClientWithCookies();
    const { data: teamRow, error: fetchErr } = await supabase
      .from("equipes")
      .select("id, org_id")
      .eq("id", teamId)
      .maybeSingle();

    if (fetchErr?.code === "PGRST116" || !teamRow) {
      return jsonError(404, "Equipe não encontrada.");
    }
    if (teamRow.org_id !== orgId) {
      return jsonError(403, "Equipe pertence a outra organização.");
    }

    const { data: allowedMembers, error: membersErr } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .in("user_id", desiredMembers);

    if (membersErr) {
      return jsonError(
        500,
        "Erro ao validar membros.",
        toLoggableError(membersErr)
      );
    }
    const allowedSet = new Set(
      (allowedMembers ?? []).map((row: any) => row.user_id as string)
    );
    const missing = desiredMembers.filter((id) => !allowedSet.has(id));
    if (missing.length) {
      return jsonError(
        400,
        "Todos os membros precisam pertencer à organização.",
        { missing }
      );
    }

    const { data: updated, error: updateErr } = await supabase
      .from("equipes")
      .update({
        name: trimmedName,
        leader_user_id: payload.leader,
        updated_at: new Date().toISOString(),
      })
      .eq("id", teamId)
      .select("id, name, leader_user_id")
      .single();

    if (updateErr) {
      if (updateErr.code === "23505") {
        return jsonError(409, "Já existe uma equipe com este nome.");
      }
      return jsonError(
        500,
        "Erro ao atualizar equipe.",
        toLoggableError(updateErr)
      );
    }

    const { data: currentMembers, error: currentErr } = await supabase
      .from("equipe_members")
      .select("user_id")
      .eq("equipe_id", teamId);

    if (currentErr) {
      return jsonError(
        500,
        "Erro ao carregar membros da equipe.",
        toLoggableError(currentErr)
      );
    }

    const currentSet = new Set(
      (currentMembers ?? []).map((row: any) => row.user_id as string)
    );
    const nextSet = new Set(desiredMembers);

    const toInsert = desiredMembers.filter((id) => !currentSet.has(id));
    const toRemove = Array.from(currentSet).filter(
      (id) => !nextSet.has(id)
    );

    if (toInsert.length) {
      const rows = toInsert.map((userId) => ({
        equipe_id: teamId,
        user_id: userId,
        org_id: orgId,
      }));
      const { error: insertMembersErr } = await supabase
        .from("equipe_members")
        .insert(rows);
      if (insertMembersErr) {
        return jsonError(
          500,
          "Erro ao adicionar novos membros.",
          toLoggableError(insertMembersErr)
        );
      }
    }

    if (toRemove.length) {
      const { error: deleteMembersErr } = await supabase
        .from("equipe_members")
        .delete()
        .eq("equipe_id", teamId)
        .in("user_id", toRemove);
      if (deleteMembersErr) {
        return jsonError(
          500,
          "Erro ao remover membros antigos.",
          toLoggableError(deleteMembersErr)
        );
      }
    }

    return NextResponse.json({
      item: {
        id: updated.id,
        name: updated.name,
        leader: updated.leader_user_id,
        members: desiredMembers,
      },
      updated_by: auth.userId,
    });
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao atualizar equipe.",
      toLoggableError(error)
    );
  }
}

export async function DELETE(
  _req: Request,
  context: RouteContext<"/api/equipes/[teamId]">
) {
  try {
    const scope = await getTeamContext();
    if ("error" in scope) return scope.error;
    const { orgId } = scope;

    const parsedParams = ParamsSchema.safeParse(await context.params);
    if (!parsedParams.success) {
      return jsonError(
        400,
        "Parâmetros inválidos.",
        parsedParams.error.flatten()
      );
    }
    const { teamId } = parsedParams.data;

    const supabase = createServerClientWithCookies();

    const { data: existing, error: existingErr } = await supabase
      .from("equipes")
      .select("id, org_id")
      .eq("id", teamId)
      .maybeSingle();

    if (existingErr?.code === "PGRST116" || !existing) {
      return jsonError(404, "Equipe não encontrada.");
    }
    if (existing.org_id !== orgId) {
      return jsonError(403, "Equipe pertence a outra organização.");
    }

    const { error: deleteErr } = await supabase
      .from("equipes")
      .delete()
      .eq("id", teamId);

    if (deleteErr) {
      return jsonError(
        500,
        "Erro ao excluir equipe.",
        toLoggableError(deleteErr)
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao excluir equipe.",
      toLoggableError(error)
    );
  }
}
