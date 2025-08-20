import { getAuthContext } from "@/lib/auth-context";

/**
 * [LEGACY NO-OP]
 * Em modo single-org não existe "organização ativa" para resolver.
 * Mantemos a assinatura por compatibilidade com chamadas existentes,
 * mas não consultamos DB nem org_members. Sempre retornamos { auth, org: null }.
 */
type ActiveOrg = null;

export async function getActiveOrgForSidebar(): Promise<{
  auth: Awaited<ReturnType<typeof getAuthContext>>;
  org: ActiveOrg;
}> {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG active-org (single-org): start");
  }

  const auth = await getAuthContext();

  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG active-org (single-org): result", {
      authSnapshot: auth
        ? {
            userId: auth.userId,
            platformRole: auth.platformRole,
            orgRole: auth.orgRole,
          }
        : null,
    });
  }

  // No single-org, não retornamos mais "org" (nem buscamos em DB)
  return { auth, org: null };
}
