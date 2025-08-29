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
    const invitedRole = (md["invited_role"] as string) || null;
    const invitedBy = (md["invited_by"] as string) || null;

    // Log leve para depuração (sem dados sensíveis)
    logInfo("finalize-invite:metadata", {
      hasSessionMd: !!Object.keys(sessionMd).length,
      hasAdminMd: !!Object.keys(adminMd).length,
      hasAppMd: !!Object.keys(appMd).length,
      invitedOrgId: !!invitedOrgId,
      invitedRole: !!invitedRole,
    });

    // 5) Sem metadados => idempotente (não falha)
    if (!invitedOrgId || !invitedRole) {
      logInfo("finalize-invite:noop", { userId, reason: "no-invite-metadata" });
      return NextResponse.json(
        { ok: true, noop: true, reason: "no-invite-metadata" },
        { status: 200 }
      );
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
      // 7) Inserir vínculo (service key bypassa RLS com segurança)
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
