// src/app/api/users/invite-magic/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getAuthContext } from "@/lib/auth-context";
import { canManageUsers } from "@/lib/permissions-users";
import { logError, logInfo } from "@/lib/log";

export const dynamic = "force-dynamic";

// ▶️ role agora é OPCIONAL
const Body = z.object({
  email: z.string().email(),
  role: z
    .enum(["org_admin", "org_master", "unit_master", "unit_user"])
    .optional(),
  orgId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  // 1) Autorização
  const auth = await getAuthContext();
  if (!auth || !canManageUsers(auth)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Acesso negado: apenas platform_admin ou org_admin.",
      },
      { status: 403 }
    );
  }

  // 2) Body
  let parsed;
  try {
    const json = await request.json();
    parsed = Body.safeParse(json);
  } catch (err) {
    logError("invite-magic:parse-body", { error: err });
    return NextResponse.json(
      { ok: false, error: "Body inválido" },
      { status: 400 }
    );
  }
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "Parâmetros inválidos",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const email = parsed.data.email.trim().toLowerCase();
  // ▶️ default seguro quando UI não envia role
  const invitedRole = parsed.data.role ?? "unit_user";
  const orgIdFromBody = parsed.data.orgId;

  // 3) Supabase Admin (service role) — para criar usuário via Magic Link
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) {
    logError("invite-magic:env-missing", {
      supabaseUrl: !!supabaseUrl,
      serviceKey: !!serviceKey,
    });
    return NextResponse.json(
      { ok: false, error: "Configuração do Supabase ausente." },
      { status: 500 }
    );
  }
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // 4) Remetente
  const inviterId = auth.user?.id;
  if (!inviterId) {
    return NextResponse.json(
      { ok: false, error: "Sessão inválida. Refaça login." },
      { status: 401 }
    );
  }

  // 5) Descobrir/validar org do convite
  async function getInviterAdminOrgIdFallback(): Promise<string | null> {
    const { data, error } = await supabaseAdmin
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", inviterId);
    if (error) {
      logError("invite-magic:orgLookup", { error, inviterId });
      return null;
    }
    const adminRow = (data || []).find((r) =>
      ["org_admin", "org_master"].includes(r.role)
    );
    return adminRow?.org_id ?? null;
  }

  let invitedOrgId: string | null = null;
  if (orgIdFromBody) {
    const { data: checkRow, error: checkErr } = await supabaseAdmin
      .from("org_members")
      .select("role")
      .eq("user_id", inviterId)
      .eq("org_id", orgIdFromBody)
      .maybeSingle();

    if (checkErr) {
      logError("invite-magic:orgCheck", {
        error: checkErr,
        inviterId,
        orgIdFromBody,
      });
      return NextResponse.json(
        { ok: false, error: "Falha ao validar a organização informada." },
        { status: 400 }
      );
    }
    if (
      !checkRow?.role ||
      !["org_admin", "org_master"].includes(checkRow.role)
    ) {
      return NextResponse.json(
        { ok: false, error: "Você não é admin da organização informada." },
        { status: 403 }
      );
    }
    invitedOrgId = orgIdFromBody;
  } else {
    invitedOrgId = await getInviterAdminOrgIdFallback();
    if (!invitedOrgId) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Não foi possível determinar a organização do remetente. Informe orgId no convite.",
        },
        { status: 400 }
      );
    }
  }

  // 6) Redirect do Magic Link (volta para o seu fluxo original)
  const appUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:9002";
  const redirectTo = new URL("/auth/magic", appUrl).toString();

  // 7) Magic Link com metadados
  const { error } = await supabaseAdmin.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
      data: {
        invited_org_id: invitedOrgId,
        invited_role: invitedRole,
        invited_by: inviterId,
      },
    },
  });

  if (error) {
    logError("invite-magic:signInWithOtp", {
      error,
      context: { email, invitedOrgId, invitedRole, inviterId },
    });
    return NextResponse.json(
      { ok: false, error: error.message ?? "Falha ao enviar Magic Link." },
      { status: 400 }
    );
  }

  logInfo("invite-magic:success", {
    context: {
      type: "magic-link",
      email,
      invitedOrgId,
      invitedRole,
      invitedBy: inviterId,
      redirectTo,
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
