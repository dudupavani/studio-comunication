// src/app/(app)/users/page.tsx
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getUsers } from "@/lib/actions/user";
import { canManageUsers } from "@/lib/permissions-users";
import { isPlatformAdmin } from "@/lib/permissions";
import UsersClient from "@/components/users/users-client";

export default async function UsersPage({ searchParams }: { searchParams: { role?: string } }) {
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /users enter");
  }
  const auth = await getAuthContext();
  if (process.env.NODE_ENV !== "production") {
    console.log("DEBUG /users auth:", {
      userId: auth?.userId,
      platformRole: auth?.platformRole,
      orgId: auth?.orgId,
      orgRole: auth?.orgRole,
    });
  }
  if (!auth) redirect("/");

  // 🔐 se ainda precisa definir a senha no primeiro acesso, redireciona
  if (auth.user?.user_metadata?.must_set_password) {
    redirect("/auth/force-password");
  }

  // 🔐 Verifica permissão para gerenciar usuários
  if (!canManageUsers(auth)) {
    if (process.env.NODE_ENV !== "production") {
      console.log("DEBUG /users redirecting to /profile - no permissions");
    }
    redirect("/profile");
  }

  // escolha do org escopo:
  const canPlatform = isPlatformAdmin(auth);
  const effectiveOrgId =
    // se platform_admin e tiver org "ativa" use-a, senão sem filtro
    canPlatform && auth?.orgId
      ? auth.orgId
      : // se org_admin, use org do perfil
        auth?.orgId ?? null;

  const users = await getUsers(effectiveOrgId ?? undefined);
  const roleFilter = searchParams.role || null;

  return (
    <div className="p-4">
      <UsersClient 
        initialUsers={users} 
        authContext={auth} 
        canPlatform={canPlatform} 
        roleFilter={roleFilter}
      />
    </div>
  );
}
