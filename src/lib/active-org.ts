import { createClient } from "@/lib/supabase/server";
import { getAuthContext } from "@/lib/auth-context";

type ActiveOrg = { id: string; slug: string; name: string | null };

export async function getActiveOrgForSidebar(): Promise<{ auth: any; org: ActiveOrg | null }> {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG active-org start");
  }
  const auth = await getAuthContext();
  const supabase = await createClient();

  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG active-org auth snapshot:", { orgId: auth?.orgId, userId: auth?.userId });
  }

  let orgId: string | null = auth?.orgId ?? null;

  // Fallback: se não veio orgId do perfil/contexto, tenta descobrir pela primeira membership
  if (!orgId && auth?.userId) {
    const { data: m1, error: m1Err } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", auth.userId)
      .limit(1)
      .maybeSingle();
    if (!m1Err && m1?.org_id) {
      orgId = m1.org_id;
    } else if (process.env.NODE_ENV !== "production") {
      console.warn("active-org fallback — no org_members row for user", { userId: auth?.userId, m1Err });
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("DEBUG active-org fallback membership orgId:", orgId);
    }
  }

  if (!orgId) {
    if (process.env.NODE_ENV !== "production") {
      console.log("DEBUG active-org result:", { org: null });
    }
    return { auth, org: null };
  }

  const { data: org, error } = await supabase
    .from("orgs")
    .select("id, slug, name")
    .eq("id", orgId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("getActiveOrgForSidebar — org fetch error", { error, orgId });
    }
    if (process.env.NODE_ENV !== "production") {
      console.log("DEBUG active-org result:", { org: null });
    }
    return { auth, org: null };
  }

  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG active-org result:", { org: org ? { id: org.id, slug: org.slug } : null });
  }
  return { auth, org: org as ActiveOrg };
}