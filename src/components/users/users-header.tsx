"use client";

import { Button } from "@/components/ui/button";
import { NewUserModal } from "@/components/users/new-user-modal";
import { useAuthContext } from "@/hooks/use-auth-context";
import { permissions } from "@/lib/permissions";

export function UsersHeader() {
  const { auth, loading } = useAuthContext();

  // enquanto carrega, evita flicker
  if (loading) {
    return (
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Usuários</h1>
      </div>
    );
  }

  const canCreate =
    !!auth && !!auth.orgId && permissions.canManageOrgUsers(auth, auth.orgId);

  return (
    <div className="flex items-center justify-between mb-4">
      <h1 className="text-xl font-semibold">Usuários</h1>

      {canCreate && (
        <NewUserModal>
          <Button size="sm">Novo usuário</Button>
        </NewUserModal>
      )}
    </div>
  );
}
