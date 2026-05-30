// src/app/api/auth/finalize-invite/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // sessão do usuário (cookies)
import { createAdminClient } from "@/lib/supabase/admin"; // service role
import { logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

export async function POST(_req: Request) {
  try {
    // 1) Usuário logado (ele mesmo finaliza seu convite)
    const supa = createClient();
    const { data: meRes, error: meErr } = await supa.auth.getUser();
    if (meErr || !meRes?.user) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 }
      );
    }
    const userId = meRes.user.id;

    // 2) Admin client para leitura/insert
    const admin = createAdminClient();

    // 3) Buscar via Admin API (para termos ambos user_metadata/app_metadata)
    const { data: adminUserRes, error: getErr } =
      await admin.auth.admin.getUserById(userId);
    if (getErr || !adminUserRes?.user) {
      logError("finalize-invite:getUserById", { error: getErr, userId });
      return NextResponse.json(
        { ok: false, error: "Falha ao carregar usuário." },
        { status: 500 }
      );
    }

    // 4) Coletar metadados de forma robusta
    //    - Primeiro os metadados da própria sessão
    //    - Depois da Admin API (user_metadata)
    //    - Por fim app_metadata (fallback)
    const sessionMd = (meRes.user.user_metadata ?? {}) as Record<
      string,
      unknown
    >;
    const adminMd = (adminUserRes.user.user_metadata ?? {}) as Record<
      string,
      unknown
    >;
    const appMd = (adminUserRes.user.app_metadata ?? {}) as Record<
      string,
      unknown
    >;

    const md = {
      ...appMd, // fallback por baixo
      ...adminMd, // preferir os do user_metadata
      ...sessionMd, // e por fim os da sessão (se existirem)
    };

    const invitedOrgId = (md["invited_org_id"] as string) || null;
    const invitedRoleRaw = (md["invited_role"] as string) || null;
    const invitedBy = (md["invited_by"] as string) || null;

    const ALLOWED_ROLES = ["org_admin", "org_master", "unit_master", "unit_user"] as const;
    type AllowedRole = (typeof ALLOWED_ROLES)[number];

    const invitedRole: AllowedRole | null =
      invitedRoleRaw && (ALLOWED_ROLES as readonly string[]).includes(invitedRoleRaw)
        ? (invitedRoleRaw as AllowedRole)
        : null;

    // Log leve para depuração (sem dados sensíveis)
    logInfo("finalize-invite:metadata", {
      hasSessionMd: !!Object.keys(sessionMd).length,
      hasAdminMd: !!Object.keys(adminMd).length,
      hasAppMd: !!Object.keys(appMd).length,
      invitedOrgId: !!invitedOrgId,
      invitedRole: !!invitedRole,
    });

    // 5) Sem metadados ou papel inválido => idempotente (não falha)
    if (!invitedOrgId || !invitedRole) {
      logInfo("finalize-invite:noop", { userId, reason: "no-invite-metadata" });
      return NextResponse.json(
        { ok: true, noop: true, reason: "no-invite-metadata" },
        { status: 200 }
      );
    }

    // 5b) Re-validação de papéis em tempo de finalização.
    //     Matriz espelhada ao invite:
    //       org_admin  → somente platform_admin pode conceder
    //       org_master → platform_admin ou org_admin da mesma org pode conceder
    if (invitedRole === "org_admin" || invitedRole === "org_master") {
      let inviterIsAuthorized = false;

      if (invitedBy) {
        const { data: inviterProfile } = await admin
          .from("profiles")
          .select("global_role")
          .eq("id", invitedBy)
          .maybeSingle();

        if (inviterProfile?.global_role === "platform_admin") {
          inviterIsAuthorized = true;
        } else if (invitedRole === "org_master") {
          // org_admin da mesma org também pode conceder org_master
          const { data: inviterMembership } = await admin
            .from("org_members")
            .select("role")
            .eq("user_id", invitedBy)
            .eq("org_id", invitedOrgId)
            .maybeSingle();
          inviterIsAuthorized = inviterMembership?.role === "org_admin";
        }
      }

      if (!inviterIsAuthorized) {
        logInfo("finalize-invite:privileged-role-blocked", {
          userId,
          invitedRole,
          reason: "inviter-not-authorized",
        });
        return NextResponse.json(
          { ok: true, noop: true, reason: "role-not-authorized" },
          { status: 200 }
        );
      }
    }

    // 6) Idempotência: já existe vínculo?
    const { data: existsRow, error: existsErr } = await admin
      .from("org_members")
      .select("user_id")
      .eq("user_id", userId)
      .eq("org_id", invitedOrgId)
      .maybeSingle();

    if (existsErr) {
      logError("finalize-invite:exists-check", {
        error: existsErr,
        userId,
        invitedOrgId,
      });
      return NextResponse.json(
        { ok: false, error: "Falha ao checar vínculo existente." },
        { status: 500 }
      );
    }

    if (!existsRow) {
      // 7a) Garantir que o profile existe antes de inserir em org_members.
      //     O trigger handle_new_user deveria ter criado, mas este upsert
      //     age como segundo cinturão caso o trigger não tenha disparado
      //     (ex: ambiente de staging sem o trigger versionado).
      const fullName =
        (md["full_name"] as string | undefined) ||
        (md["name"] as string | undefined) ||
        null;
      const { error: profileErr } = await admin
        .from("profiles")
        .insert({ id: userId, full_name: fullName });
      // 23505 = unique_violation: trigger already created the profile — safe to ignore
      if (profileErr && profileErr.code !== "23505") {
        logError("finalize-invite:profile-ensure", { error: profileErr, userId });
        return NextResponse.json(
          { ok: false, error: "Falha ao garantir perfil do usuário." },
          { status: 500 }
        );
      }

      // 7b) Inserir vínculo (service key bypassa RLS com segurança)
      const { error: insertErr } = await admin
        .from("org_members")
        .insert({ org_id: invitedOrgId, user_id: userId, role: invitedRole });

      if (insertErr) {
        logError("finalize-invite:insert", {
          error: insertErr,
          userId,
          invitedOrgId,
          invitedRole,
          invitedBy,
        });
        return NextResponse.json(
          { ok: false, error: "Falha ao vincular usuário à organização." },
          { status: 500 }
        );
      }
    }

    // 8) Limpar metadados para não repetir
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: {
        invited_org_id: null,
        invited_role: null,
        invited_by: null,
        invited_finalized_at: new Date().toISOString(),
      },
    });
    if (updErr) {
      logError("finalize-invite:clear-metadata", { error: updErr, userId });
      // não bloqueia o sucesso do vínculo
    }

    logInfo("finalize-invite:success", {
      userId,
      invitedOrgId,
      invitedRole,
      invitedBy,
    });
    return NextResponse.json(
      { ok: true, orgId: invitedOrgId, role: invitedRole },
      { status: 200 }
    );
  } catch (err) {
    logError("finalize-invite:POST", { error: err });
    return NextResponse.json(
      { ok: false, error: "Erro inesperado." },
      { status: 500 }
    );
  }
}
