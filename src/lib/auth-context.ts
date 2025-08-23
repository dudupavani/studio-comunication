// src/lib/auth-context.ts
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@supabase/supabase-js";
import type { PlatformRole, OrgRole, UnitRole } from "@/lib/types/roles";

const PLATFORM_ADMIN: PlatformRole = "platform_admin";

// Alias local: valor de org_members.role pode ser org_* OU unit_*
type MembershipRole = OrgRole | UnitRole;

// precedência dos papéis de membership (org_members.role)
const ROLE_PRIORITY: Record<string, number> = {
  org_admin: 3,
  org_master: 2,
  unit_master: 2,
  unit_user: 1,
};

export type AuthContext = {
  userId: string;
  platformRole: PlatformRole | null;
  /** Papel do usuário na organização (vem de org_members.role): org_* ou unit_* */
  orgRole: MembershipRole | null;
  /** Organização “ativa” inferida do melhor papel */
  orgId?: string;
  /** Unidades às quais o usuário pertence */
  unitIds: string[];
  /** Objeto do usuário do Supabase */
  user?: User;
};

async function _getAuthContext(): Promise<AuthContext | null> {
  const isDev = process.env.NODE_ENV !== "production";
  const supabase = createClient();

  // 1) Sessão primeiro; fallback para getUser()
  if (isDev) console.time("auth:getSession");
  const { data: sessionData } = await supabase.auth.getSession();
  if (isDev) console.timeEnd("auth:getSession");

  let user: User | null = sessionData?.session?.user ?? null;
  if (!user) {
    if (isDev) console.time("auth:getUser");
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (isDev) console.timeEnd("auth:getUser");
    if (userErr || !userData?.user) return null;
    user = userData.user;
  }

  // 2) Consultas paralelas já filtradas por este usuário
  if (isDev) console.time("auth:parallel");
  const [profileRes, orgRes, unitRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, global_role")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("org_members").select("org_id, role").eq("user_id", user.id),
    supabase
      .from("unit_members")
      .select("unit_id, org_id")
      .eq("user_id", user.id),
  ]);
  if (isDev) console.timeEnd("auth:parallel");

  // 3) Platform role
  let platformRole: PlatformRole | null = null;
  const profileAny = (profileRes.data ?? {}) as any;
  if (profileAny?.global_role === PLATFORM_ADMIN) {
    platformRole = PLATFORM_ADMIN;
  }

  // 4) Escolher melhor papel/org (com precedência)
  let orgRole: MembershipRole | null = null;
  let orgId: string | undefined = undefined;

  const orgRows = (Array.isArray(orgRes.data) ? orgRes.data : []) as Array<{
    org_id: string;
    role: string; // mapeamos via ROLE_PRIORITY
  }>;

  if (orgRows.length > 0) {
    const best = orgRows.reduce((acc, cur) => {
      const accScore = ROLE_PRIORITY[acc.role] ?? 0;
      const curScore = ROLE_PRIORITY[cur.role] ?? 0;
      return curScore > accScore ? cur : acc;
    }, orgRows[0]);

    orgId = best.org_id as string;
    if (!platformRole && best.role) {
      orgRole = best.role as MembershipRole;
    }
  }

  // 5) Unidades
  const unitIds: string[] = Array.isArray(unitRes.data)
    ? unitRes.data.map((r: any) => r.unit_id as string)
    : [];

  const authContext: AuthContext = {
    userId: user.id,
    platformRole,
    orgRole,
    orgId,
    unitIds,
    user,
  };

  if (isDev) {
    console.log("DEBUG getAuthContext — computed:", authContext);
  }

  return authContext;
}

// memo por request + exports explícitos
const getAuthContext = cache(_getAuthContext);
export { getAuthContext };
export default getAuthContext;
