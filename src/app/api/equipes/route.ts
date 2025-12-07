// src/app/api/equipes/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthContext, type AuthContext } from "@/lib/auth-context";
import {
  createClient,
  createServerClientWithCookies,
} from "@/lib/supabase/server";
import { toLoggableError } from "@/lib/log";
import { enrichOrgUsersWithAuthMetadata } from "@/lib/teams/enrich-org-users";
import type { OrgUserOption } from "@/components/teams/types";

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

const CreateTeamSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  leader: z.string().uuid("Líder inválido"),
  members: z
    .array(z.string().uuid("ID de usuário inválido"))
    .min(1, "Selecione ao menos um membro"),
});

export async function GET() {
  try {
    const ctx = await getTeamContext();
    if ("error" in ctx) return ctx.error;
    const { orgId } = ctx;

    const supabase = await createClient();

    const [teamsRes, usersRes] = await Promise.all([
      supabase
        .from("equipes")
        .select(
          `
          id,
          name,
          leader_user_id,
          updated_at,
          leader:profiles!equipes_leader_user_id_fkey (
            id,
            full_name,
            avatar_url
          ),
          members:equipe_members (
            user_id
          )
        `
        )
        .eq("org_id", orgId)
        .order("name", { ascending: true }),
      supabase
        .from("org_members")
        .select(
          `
          user_id,
          role,
          profiles:profiles!org_members_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq("org_id", orgId),
    ]);

    if (teamsRes.error) {
      return jsonError(
        500,
        "Erro ao listar equipes.",
        toLoggableError(teamsRes.error)
      );
    }
    if (usersRes.error) {
      return jsonError(
        500,
        "Erro ao carregar usuários da organização.",
        toLoggableError(usersRes.error)
      );
    }

    let users: OrgUserOption[] =
      usersRes.data
        ?.map((row: any) => ({
          id: row.user_id as string,
          role: row.role as string | null,
          name: row.profiles?.full_name ?? "Sem nome",
          email: null,
          avatarUrl: row.profiles?.avatar_url ?? null,
          title: null,
        }))
        .sort((a, b) =>
          (a.name ?? "").localeCompare(b.name ?? "", "pt-BR", {
            sensitivity: "base",
          })
        ) ?? [];

    users = await enrichOrgUsersWithAuthMetadata(users);

    const userMap = new Map(users.map((user) => [user.id, user]));

    const teams =
      teamsRes.data?.map((row: any) => {
        const members = Array.isArray(row.members)
          ? row.members.map((member: any) => {
              const memberId = member.user_id as string;
              const info = userMap.get(memberId);
              return {
                id: memberId,
                name: info?.name ?? "Sem nome",
                avatarUrl: info?.avatarUrl ?? null,
              };
            })
          : [];

        const leaderInfo = userMap.get(row.leader_user_id as string);

        return {
          id: row.id as string,
          name: row.name as string,
          leaderId: (row.leader_user_id as string) ?? null,
          leaderName: row.leader?.full_name ?? leaderInfo?.name ?? null,
          leaderAvatarUrl:
            row.leader?.avatar_url ?? leaderInfo?.avatarUrl ?? null,
          membersCount: members.length,
          members,
          updatedAt: row.updated_at ?? null,
        };
      }) ?? [];

    return NextResponse.json({ teams, users });
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao carregar equipes.",
      toLoggableError(error)
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getTeamContext();
    if ("error" in ctx) return ctx.error;
    const { auth, orgId } = ctx;

    let bodyRaw: unknown = {};
    try {
      bodyRaw = await req.json();
    } catch {
      /* corpo vazio */
    }

    const parsed = CreateTeamSchema.safeParse(bodyRaw);
    if (!parsed.success) {
      return jsonError(422, "Dados inválidos.", parsed.error.flatten());
    }

    const payload = parsed.data;
    const trimmedName = payload.name.trim();
    const uniqueMembers = Array.from(new Set(payload.members));

    if (!trimmedName) {
      return jsonError(400, "Nome da equipe é obrigatório.");
    }
    if (!uniqueMembers.length) {
      return jsonError(400, "Selecione ao menos um membro.");
    }
    if (!uniqueMembers.includes(payload.leader)) {
      return jsonError(
        400,
        "O líder precisa estar entre os membros selecionados."
      );
    }

    const supabase = createServerClientWithCookies();

    const { data: allowedMembers, error: membersErr } = await supabase
      .from("org_members")
      .select("user_id")
      .eq("org_id", orgId)
      .in("user_id", uniqueMembers);

    if (membersErr) {
      return jsonError(
        500,
        "Erro ao validar membros da equipe.",
        toLoggableError(membersErr)
      );
    }

    const allowedSet = new Set(
      (allowedMembers ?? []).map((row: any) => row.user_id as string)
    );
    const missing = uniqueMembers.filter((id) => !allowedSet.has(id));
    if (missing.length) {
      return jsonError(
        400,
        "Todos os membros precisam pertencer à organização.",
        { missing }
      );
    }

    const { data: created, error: insertErr } = await supabase
      .from("equipes")
      .insert({
        org_id: orgId,
        name: trimmedName,
        leader_user_id: payload.leader,
        created_by: auth.userId,
      })
      .select("id, name, leader_user_id")
      .single();

    if (insertErr) {
      if (insertErr.code === "23505") {
        return jsonError(409, "Já existe uma equipe com este nome.");
      }
      return jsonError(
        500,
        "Erro ao criar equipe.",
        toLoggableError(insertErr)
      );
    }

    const memberRows = uniqueMembers.map((userId) => ({
      equipe_id: created.id,
      user_id: userId,
      org_id: orgId,
    }));

    const { error: membersInsertErr } = await supabase
      .from("equipe_members")
      .insert(memberRows);

    if (membersInsertErr) {
      await supabase.from("equipes").delete().eq("id", created.id);
      return jsonError(
        500,
        "Erro ao vincular membros à equipe recém criada.",
        toLoggableError(membersInsertErr)
      );
    }

    return NextResponse.json(
      { item: created },
      {
        status: 201,
      }
    );
  } catch (error) {
    return jsonError(
      500,
      "Erro inesperado ao criar equipe.",
      toLoggableError(error)
    );
  }
}
