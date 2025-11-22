// src/lib/messages/auth-context.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClientReadOnly } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type AuthContext = {
  userId: string;
  orgId: string;
  role: string;
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
  isUnitMaster: boolean;
  unitIds: string[];
};

const ROLE_PRIORITY: Record<string, number> = {
  org_admin: 3,
  org_master: 4,
  unit_master: 2,
  unit_user: 1,
};

const ORG_ADMIN_ROLES = new Set(["org_admin", "org_master"]);

function buildError(status: number, message: string) {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export async function getAuthContext(
  client?: SupabaseClient<Database>
): Promise<AuthContext> {
  const supabase = client ?? createServerClientReadOnly();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    throw buildError(401, "Not authenticated");
  }

  const userId = userData.user.id;

  const [
    { data: profile },
    { data: memberships, error: memberError },
    { data: unitMemberships, error: unitError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("global_role")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId),
    supabase
      .from("unit_members")
      .select("unit_id, org_id")
      .eq("user_id", userId),
  ]);

  if (memberError) {
    throw buildError(500, "Failed to load memberships");
  }

  if (unitError) {
    console.warn("MESSAGES auth unit_members lookup error:", unitError);
  }

  const membershipRows = Array.isArray(memberships) ? memberships : [];
  if (membershipRows.length === 0) {
    throw buildError(403, "No organization");
  }

  const bestMembership = membershipRows.slice(1).reduce((acc, cur) => {
    const accScore = ROLE_PRIORITY[acc.role as string] ?? 0;
    const curScore = ROLE_PRIORITY[cur.role as string] ?? 0;
    return curScore > accScore ? cur : acc;
  }, membershipRows[0]);

  const orgId = bestMembership.org_id as string;
  const role = (bestMembership.role as string) ?? "";

  const isPlatformAdmin = profile?.global_role === "platform_admin";
  const isOrgAdmin = ORG_ADMIN_ROLES.has(role);
  const isUnitMaster = role === "unit_master";

  const unitRows = Array.isArray(unitMemberships) ? unitMemberships : [];
  const unitIds = unitRows
    .filter((row: any) => row.org_id === orgId)
    .map((row: any) => row.unit_id as string)
    .filter(Boolean);

  return {
    userId,
    orgId,
    role,
    isPlatformAdmin: !!isPlatformAdmin,
    isOrgAdmin,
    isUnitMaster,
    unitIds,
  };
}
