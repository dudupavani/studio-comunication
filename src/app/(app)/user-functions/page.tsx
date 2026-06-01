import { redirect } from "next/navigation";

import UserFunctionsClient from "@/components/user-functions/user-functions-client";
import { getAuthContext } from "@/lib/auth-context";
import { canUsePermission } from "@/lib/permissions/user-functions";

export const dynamic = "force-dynamic";

export default async function UserFunctionsPage() {
  const auth = await getAuthContext();
  if (!auth) redirect("/login");
  if (!auth.orgId) redirect("/dashboard");

  const canAccess =
    auth.platformRole === "platform_admin" ||
    auth.orgRole === "org_admin" ||
    (await canUsePermission(auth, "manage_user_functions"));

  if (!canAccess) redirect("/dashboard");

  return <UserFunctionsClient />;
}
