import {
  getAuthContext as getGlobalAuthContext,
  type AuthContext as GlobalAuthContext,
} from "@/lib/auth-context";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type AuthContext = {
  userId: string;
  orgId: string;
  role: GlobalAuthContext["orgRole"];
  isPlatformAdmin: boolean;
  isOrgAdmin: boolean;
  isUnitMaster: boolean;
  unitIds: string[];
};

export async function getAuthContext(
  supabaseClient?: SupabaseClient<Database>
): Promise<AuthContext | null> {
  const ctx = await getGlobalAuthContext(supabaseClient);
  if (!ctx?.orgId) return null;

  return {
    userId: ctx.userId,
    orgId: ctx.orgId,
    role: ctx.orgRole,
    isPlatformAdmin: ctx.platformRole === "platform_admin",
    isOrgAdmin: ctx.orgRole === "org_admin" || ctx.orgRole === "org_master",
    isUnitMaster: ctx.orgRole === "unit_master",
    unitIds: ctx.unitIds,
  };
}

export default getAuthContext;
