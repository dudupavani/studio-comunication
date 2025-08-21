// src/components/users/users-client.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { Pencil, MoreHorizontal, Trash, UserX, UserCheck } from "lucide-react";
import { PLATFORM_ADMIN } from "@/lib/types/roles";
import { isPlatformAdminProfile } from "@/lib/ui/guards";
import { getRoleLabel } from "@/lib/role-labels";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import NewUserModal from "@/components/users/new-user-modal";
import DisableUserDialog from "@/components/users/disable-user-dialog";
import EnableUserDialog from "@/components/users/enable-user-dialog";

// Função para determinar a role a ser exibida com base na prioridade
function getDisplayRole(user: any): string {
  // 1. profile.global_role (se não for null)
  if (user.global_role && user.global_role !== "" && user.global_role !== null) {
    const label = getRoleLabel(user.global_role);
    return label;
  }

  // 2. org_members.role (quando existir)
  if (user.org_role && user.org_role !== "" && user.org_role !== null) {
    const label = getRoleLabel(user.org_role);
    return label;
  }

  // 3. unit_members.role (quando existir)
  if (user.unit_roles && user.unit_roles.length > 0 && user.unit_roles[0] !== null) {
    const label = getRoleLabel(user.unit_roles[0]); // Pega o primeiro role de unidade
    return label;
  }

  // Fallback
  return "-";
}

export default function UsersClient({
  initialUsers,
  authContext,
  canPlatform,
  roleFilter: initialRoleFilter,
}: {
  initialUsers: any[];
  authContext: any;
  canPlatform: boolean;
  roleFilter: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState(initialUsers);
  const [roleFilter, setRoleFilter] = useState<string | null>(
    initialRoleFilter
  );

  // Função para filtrar usuários por role
  const filterUsersByRole = (usersToFilter: any[], role: string | null) => {
    if (!role || role === "all") return usersToFilter;

    return usersToFilter.filter((user) => {
      // Verifica se o usuário tem o role específico
      if (role === "unit_master" && user.unit_roles?.includes("unit_master"))
        return true;
      if (role === "unit_user" && user.unit_roles?.includes("unit_user"))
        return true;
      if (role === "no_role") {
        // Usuários sem vínculo com unidades (não tem unit_roles)
        // Mas pode ter global_role ou org_role
        return !user.unit_roles || user.unit_roles.length === 0;
      }

      return false;
    });
  };

  // Atualiza os usuários filtrados quando o filtro muda
  useEffect(() => {
    const filtered = filterUsersByRole(initialUsers, roleFilter);
    setUsers(filtered);
  }, [roleFilter, initialUsers]);

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);

    // Atualiza a URL com o parâmetro de filtro
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set("role", value);
    } else {
      params.delete("role");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-end mb-4 gap-6">
        <div className="flex items-center gap-2">
          <Select value={roleFilter || "all"} onValueChange={handleRoleChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              <SelectItem value="no_role">Matriz</SelectItem>
              <SelectItem value="unit_master">Unid. Master</SelectItem>
              <SelectItem value="unit_user">Unid. User</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          {(canPlatform || authContext?.orgRole === "org_admin") &&
            authContext?.orgId && <NewUserModal />}
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-md border">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/50 text-left">
              <TableHead className="px-4 py-3">Nome</TableHead>
              <TableHead className="px-4 py-3">Função</TableHead>
              <TableHead className="px-4 py-3">Unidade</TableHead>
              <TableHead className="px-4 py-3">Registro</TableHead>
              <TableHead className="px-4 py-3 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="px-4 py-6 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user: any) => (
                <TableRow key={user.id} className="border-t">
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-4">
                      {user.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatar_url}
                          alt={user.full_name || "Avatar"}
                          className="h-8 w-8 rounded-full"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {(user.full_name ?? "NN")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-sm">
                          {user.full_name || "No name"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    <Badge
                      variant={
                        user?.disabled
                          ? "destructive"
                          : user.global_role === PLATFORM_ADMIN
                          ? "default"
                          : "secondary"
                      }>
                      {user?.disabled ? "Desativado" : getDisplayRole(user)}
                    </Badge>
                  </TableCell>

                  <TableCell className="px-4 py-3">
                    {user.unit_names && user.unit_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.unit_names.map(
                          (unitName: string, index: number) => (
                            <span>{unitName}</span>
                          )
                        )}
                      </div>
                    ) : (
                      <span>Matriz</span>
                    )}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-sm text-primary">
                    {user.created_at
                      ? format(
                          new Date(user.created_at),
                          "dd/MM/yyyy - HH:mm",
                          { locale: ptBR }
                        )
                      : "-"}
                  </TableCell>

                  <TableCell className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-2 hover:bg-muted rounded-md">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Editar */}
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/users/${user.id}/edit`}
                            className="flex items-center gap-2 cursor-pointer">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Link>
                        </DropdownMenuItem>

                        {/* Ações perigosas - escondidas para platform_admin */}
                        {!isPlatformAdminProfile(user) && (
                          <>
                            {/* Ativar / Desativar (com modal) */}
                            <DropdownMenuItem asChild>
                              {user?.disabled ? (
                                <EnableUserDialog
                                  userId={user.id}
                                  userName={user.full_name ?? user.email}
                                  trigger={
                                    <Link
                                      href="#"
                                      className="flex items-center gap-2">
                                      <UserCheck className="h-4 w-4" />
                                      Ativar
                                    </Link>
                                  }
                                />
                              ) : (
                                <DisableUserDialog
                                  userId={user.id}
                                  userName={user.full_name ?? user.email}
                                  trigger={
                                    <Link
                                      href="#"
                                      className="flex items-center gap-2">
                                      <UserX className="h-4 w-4" />
                                      Desativar
                                    </Link>
                                  }
                                />
                              )}
                            </DropdownMenuItem>

                            {/* Remover (placeholder) */}
                            <DropdownMenuItem asChild>
                              <Link
                                href="#"
                                className="w-full flex items-center text-destructive cursor-pointer">
                                <Trash className="h-4 w-4 mr-2" />
                                Remover
                              </Link>
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
