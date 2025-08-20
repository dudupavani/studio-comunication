import { createClient } from "@/lib/supabase/server";

export async function isOrgAdminFor(orgId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("isOrgAdminFor — org_members error", { orgId, userId, error });
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("DEBUG isOrgAdminFor:", { orgId, userId, isAdmin: false });
    }
    return false;
  }
  const isAdmin = data?.role === "org_admin";
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG isOrgAdminFor:", { orgId, userId, isAdmin });
  }
  return isAdmin;
}

export async function isUnitMasterFor(orgId: string, unitId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("unit_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("unit_id", unitId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("isUnitMasterFor — unit_members error", { orgId, unitId, userId, error });
    }
    return false;
  }
  return data?.role === "unit_master";
}