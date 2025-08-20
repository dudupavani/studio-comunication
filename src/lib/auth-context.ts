import { createClient } from "@/lib/supabase/server";
import type { PlatformRole, OrgRole } from "@/lib/types/roles";

const PLATFORM_ADMIN: PlatformRole = "platform_admin";

export type AuthContext = {
  userId: string;
  platformRole: PlatformRole | null;
  orgRole: OrgRole | null;
  orgId?: string; // ⬅️ Novo: id da org ativa (se única)
  unitIds: string[];
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = createClient();

  // 1) Usuário logado
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return null;
  const user = userData.user;

  // 2) Perfil do usuário (única fonte de verdade para roles)
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("global_role, role")
    .eq("id", user.id)
    .maybeSingle();

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    console.log("DEBUG getAuthContext — profile data:", {
      userId: user.id,
      profile,
      profileError,
    });
  }

  // Trata ausência de profile sem derrubar o fluxo
  let platformRole: PlatformRole | null = null;
  let orgRole: OrgRole | null = null;

  if (profile) {
    platformRole =
      profile.global_role === PLATFORM_ADMIN ? PLATFORM_ADMIN : null;

    // Se for platform_admin, não atribuimos orgRole
    orgRole = platformRole ? null : (profile.role as OrgRole | null);
  } else if (isDev) {
    console.warn("getAuthContext — profile not found; using safe defaults", {
      userId: user.id,
    });
  }

  // 3) Organização do usuário (se for única)
  let orgId: string | undefined = undefined;
  try {
    const { data: orgRows, error: orgErr } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(2);

    if (orgErr) {
      if (isDev) {
        console.warn("getAuthContext — org_members error (ignored)", orgErr);
      }
    } else if (Array.isArray(orgRows) && orgRows.length === 1) {
      orgId = orgRows[0].org_id as string;
    }
  } catch (e: any) {
    if (isDev) {
      console.warn("getAuthContext — org_members exception (ignored)", {
        message: e?.message,
      });
    }
  }

  // 4) Unidades do usuário — blindado contra erros de RLS/policies
  let unitIds: string[] = [];
  try {
    const { data: unitRows, error: unitErr } = await supabase
      .from("unit_members")
      .select("unit_id")
      .eq("user_id", user.id);

    if (unitErr) {
      if (isDev) {
        console.warn("getAuthContext — unit_members error (ignored)", {
          code: unitErr.code,
          message: unitErr.message,
        });
      }
    } else {
      unitIds = (unitRows ?? []).map((r) => r.unit_id as string);
    }
  } catch (e: any) {
    if (isDev) {
      console.warn("getAuthContext — unit_members exception (ignored)", {
        message: e?.message,
      });
    }
    unitIds = [];
  }

  const authContext: AuthContext = {
    userId: user.id,
    platformRole,
    orgRole,
    orgId, // ⬅️ incluído no retorno
    unitIds,
  };

  if (isDev) {
    console.log("DEBUG getAuthContext — computed:", authContext);
  }

  return authContext;
}
