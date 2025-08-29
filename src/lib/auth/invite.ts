// src/lib/auth/invite.ts
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logError, logInfo } from "@/lib/log";

const InviteInput = z.object({
  email: z.string().email(),
  invitedRole: z.enum(["org_admin", "org_master", "unit_master", "unit_user"]),
  orgId: z.string().uuid().optional(),
});

export async function inviteUserWithOrgContext(params: {
  email: string;
  invitedRole: "org_admin" | "org_master" | "unit_master" | "unit_user";
  orgId?: string;
}) {
  const parsed = InviteInput.safeParse(params);
  if (!parsed.success) {
    logError("inviteUserWithOrgContext:invalid-input", { error: parsed.error });
    throw new Error("Parâmetros inválidos.");
  }
  const { email, invitedRole } = parsed.data;

  const supa = createClient();
  const admin = createAdminClient();

  // Quem convida
  const { data: meRes, error: meErr } = await supa.auth.getUser();
  if (meErr || !meRes?.user) {
    logError("inviteUserWithOrgContext:getUser", { error: meErr ?? "no user" });
    throw new Error("Sessão inválida.");
  }
  const inviterId = meRes.user.id;

  // Determinar org
  let inviterOrgId = parsed.data.orgId;
  if (!inviterOrgId) {
    const { data: omRow, error: omErr } = await supa
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", inviterId)
      .limit(1)
      .maybeSingle();
    if (omErr) {
      logError("inviteUserWithOrgContext:orgLookup", { error: omErr });
      throw new Error("Falha ao obter organização do remetente.");
    }
    if (!omRow?.org_id) {
      throw new Error(
        "Não foi possível determinar a organização do remetente. Informe orgId no convite."
      );
    }
    inviterOrgId = omRow.org_id;
    const inviterRole = omRow.role;
    if (!["org_admin", "org_master"].includes(inviterRole)) {
      throw new Error(
        "Permissão insuficiente para convidar nesta organização."
      );
    }
  } else {
    const { data: checkRow, error: checkErr } = await supa
      .from("org_members")
      .select("role")
      .eq("user_id", inviterId)
      .eq("org_id", inviterOrgId)
      .maybeSingle();
    if (checkErr) {
      logError("inviteUserWithOrgContext:orgCheck", {
        error: checkErr,
        inviterOrgId,
      });
      throw new Error("Falha ao validar organização informada.");
    }
    if (
      !checkRow?.role ||
      !["org_admin", "org_master"].includes(checkRow.role)
    ) {
      throw new Error("Você não é admin desta organização.");
    }
  }

  // Redirect
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:9002";
  const redirectTo = `${appUrl}/auth/callback`;

  // Enviar convite (SDK v2 usa "data")
  const { data: inviteRes, error: inviteErr } =
    await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: {
        invited_org_id: inviterOrgId,
        invited_role: invitedRole,
        invited_by: inviterId,
      },
    });

  if (inviteErr) {
    logError("inviteUserWithOrgContext:inviteUserByEmail", {
      error: inviteErr,
      context: { email, inviterOrgId, invitedRole, invitedBy: inviterId },
    });
    throw new Error(inviteErr.message ?? "Falha ao enviar convite.");
  }

  logInfo("inviteUserWithOrgContext:success", {
    result: inviteRes,
    context: {
      email,
      invitedOrgId: inviterOrgId,
      invitedRole,
      invitedBy: inviterId,
    },
  });

  return { ok: true, data: inviteRes };
}
