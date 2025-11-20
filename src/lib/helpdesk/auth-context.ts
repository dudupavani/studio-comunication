// src/lib/helpdesk/auth-context.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClientReadOnly } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export type AuthContext = {
  userId: string;
  orgId: string;
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
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

  const [{ data: profile }, { data: memberships, error: memberError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("global_role")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("org_members")
      .select("org_id, role")
      .eq("user_id", userId),
  ]);

  if (memberError) {
    throw buildError(500, "Failed to load memberships");
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

  const isPlatformAdmin = profile?.global_role === "platform_admin";
  const isOrgAdmin = ORG_ADMIN_ROLES.has((bestMembership.role as string) ?? "");

  return {
    userId,
    orgId,
    isPlatformAdmin: !!isPlatformAdmin,
    isOrgAdmin,
  };
}
