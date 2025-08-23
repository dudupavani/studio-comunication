// src/app/(app)/users/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth-context";
import { getUsers } from "@/lib/actions/user";
import { canManageUsers } from "@/lib/permissions-users";
import { isPlatformAdmin } from "@/lib/permissions";
import UsersClient from "@/components/users/users-client";
import { performance } from "node:perf_hooks";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function UsersPage({
  searchParams,
}: {
  // No seu projeto, searchParams é Promise — manter assim
  searchParams: Promise<SearchParams>;
}) {
  const isDev = process.env.NODE_ENV !== "production";

  if (isDev) console.log("DEBUG /users enter");
  const t0 = performance.now();

  // 🔎 Aguardar searchParams (Next 15 exige await se tipado como Promise)
  if (isDev) console.time("await searchParams");
  const sp = await searchParams;
  if (isDev) console.timeEnd("await searchParams");

  const roleParam = sp?.role;
  const roleFilter =
    (Array.isArray(roleParam) ? roleParam[0] : roleParam) ?? null;

  // 🔐 Auth context
  if (isDev) console.time("auth-context");
  const auth = await getAuthContext();
  if (isDev) console.timeEnd("auth-context");

  if (isDev) {
    console.log("DEBUG /users auth:", {
      userId: auth?.userId,
      platformRole: auth?.platformRole,
      orgId: auth?.orgId,
      orgRole: auth?.orgRole,
    });
  }

  if (!auth) redirect("/");

  // 🚪 força troca de senha (primeiro acesso)
  if (auth.user?.user_metadata?.must_set_password) {
    redirect("/auth/force-password");
  }

  // ✅ Permissão (server-side)
  const canManage = canManageUsers(auth);
  if (isDev) {
    console.log("DEBUG /users canManageUsers:", canManage);
    console.log("DEBUG /users permission snapshot:", {
      platformRole: auth?.platformRole,
      orgRole: auth?.orgRole,
    });
  }
  if (!canManage) {
    if (isDev)
      console.log("DEBUG /users redirecting to /profile - no permissions");
    redirect("/profile");
  }

  // 🎯 Escopo de organização
  const canPlatform = isPlatformAdmin(auth);
  // Regra:
  // - platform_admin: se tiver org ativa, usa; se não, sem filtro (undefined)
  // - org_admin: usa a org do auth
  const effectiveOrgId = canPlatform
    ? auth?.orgId ?? undefined
    : auth?.orgId ?? undefined;

  if (isDev) {
    console.log(
      "DEBUG /users effectiveOrgId:",
      effectiveOrgId ?? "(none/global)"
    );
  }

  // 🧮 Carga de usuários (com métricas)
  if (isDev) console.time("load-users(getUsers)");
  let users: Awaited<ReturnType<typeof getUsers>>;
  try {
    users = await getUsers(effectiveOrgId);
  } catch (err) {
    if (isDev) console.error("ERROR getUsers:", err);
    throw err;
  } finally {
    if (isDev) console.timeEnd("load-users(getUsers)");
  }

  const t1 = performance.now();
  if (isDev) {
    console.log(`DEBUG /users total server time: ${(t1 - t0).toFixed(2)}ms`);
  }

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
