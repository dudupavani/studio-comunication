// src/components/users/users-client.tsx
// src/components/users/users-client.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "../ui/button";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pencil,
  MoreHorizontal,
  Trash,
  UserX,
  UserCheck,
  UserRoundX,
  ListFilter,
  X,
} from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import NewUserModal from "@/components/users/new-user-modal";
import DisableUserDialog from "@/components/users/disable-user-dialog";
import EnableUserDialog from "@/components/users/enable-user-dialog";
import DeleteUserDialog from "@/components/users/delete-user-dialog";
import EmailCopy from "@/components/EmailCopy"; // ⬅️ novo import
import UserSummary from "@/components/shared/user-summary";

// Função para determinar a role a ser exibida com base na prioridade
function getDisplayRole(user: any): string {
  // 1. profile.global_role (se não for null)
  if (
    user.global_role &&
    user.global_role !== "" &&
    user.global_role !== null
  ) {
    const label = getRoleLabel(user.global_role);
    return label;
  }
  // 2. org_members.role (quando existir)
  if (user.org_role && user.org_role !== "" && user.org_role !== null) {
    const label = getRoleLabel(user.org_role);
    return label;
  }
  // 3. unit_roles (quando existir) - papel efetivo vem de org_members.role
  if (
    user.unit_roles &&
    user.unit_roles.length > 0 &&
    user.unit_roles[0] !== null
  ) {
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
  const searchParamsString = searchParams?.toString() ?? "";

  // Estado do filtro (UI)
  const [roleFilter, setRoleFilter] = useState<string | null>(
    initialRoleFilter
  );
  const [statusFilter, setStatusFilter] = useState<string>(
    (searchParams?.get("status") as string) || "all"
  );
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const canDeleteUsers =
    canPlatform ||
    (authContext?.orgRole === "org_admin" && !!authContext?.orgId);

  const appliedFilterCount = useMemo(() => {
    let count = 0;
    if (roleFilter && roleFilter !== "all") count += 1;
    if (statusFilter !== "all") count += 1;
    if (unitFilter !== "all") count += 1;
    if (teamFilter !== "all") count += 1;
    return count;
  }, [roleFilter, statusFilter, unitFilter, teamFilter]);

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    initialUsers?.forEach((user: any) => {
      if (Array.isArray(user?.unit_names)) {
        user.unit_names.forEach((name: string) => {
          if (name) set.add(name);
        });
      }
    });
    return Array.from(set.values());
  }, [initialUsers]);

  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    initialUsers?.forEach((user: any) => {
      if (Array.isArray(user?.team_names)) {
        user.team_names.forEach((name: string) => {
          if (name) set.add(name);
        });
      }
    });
    return Array.from(set.values());
  }, [initialUsers]);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(initialUsers)) return [];

    // 1) Filtro por função (como já fazia antes)
    let list = initialUsers;
    if (roleFilter && roleFilter !== "all") {
      list = list.filter((user) => {
        const unitRoles: string[] = Array.isArray(user.unit_roles)
          ? user.unit_roles
          : [];

        if (roleFilter === "org_admin") return user.org_role === "org_admin";
        if (roleFilter === "org_master") return user.org_role === "org_master";
        if (roleFilter === "unit_master")
          return user.org_role === "unit_master";
        if (roleFilter === "unit_user") return user.org_role === "unit_user";
        return false;
      });
    }

    // 2) Filtro por status
    if (statusFilter === "active") {
      list = list.filter((u) => !u?.disabled);
    } else if (statusFilter === "disabled") {
      list = list.filter((u) => !!u?.disabled);
    }

    // 3) Unidade
    if (unitFilter !== "all") {
      if (unitFilter === "matriz") {
        list = list.filter(
          (u) => !Array.isArray(u.unit_names) || u.unit_names.length === 0
        );
      } else {
        list = list.filter((u) =>
          Array.isArray(u.unit_names)
            ? u.unit_names.includes(unitFilter)
            : false
        );
      }
    }

    // 5) Equipe
    if (teamFilter !== "all") {
      if (teamFilter === "sem-equipe") {
        list = list.filter(
          (u) => !Array.isArray(u.team_names) || u.team_names.length === 0
        );
      } else {
        list = list.filter((u) =>
          Array.isArray(u.team_names)
            ? u.team_names.includes(teamFilter)
            : false
        );
      }
    }

    return list;
  }, [initialUsers, roleFilter, statusFilter, unitFilter, teamFilter]);

  const handleRoleChange = (value: string) => {
    setRoleFilter(value);

    // Atualiza a URL com o parâmetro de filtro
    const params = new URLSearchParams(searchParamsString);
    if (value && value !== "all") {
      params.set("role", value);
    } else {
      params.delete("role");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);

    // Atualiza a URL com o parâmetro de filtro
    const params = new URLSearchParams(searchParamsString);
    if (value && value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleClearFilters = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    setRoleFilter(null);
    setStatusFilter("all");
    setUnitFilter("all");
    setTeamFilter("all");

    const params = new URLSearchParams(searchParamsString);
    params.delete("role");
    params.delete("status");
    const query = params.toString();
    router.push(query ? `?${query}` : "?", { scroll: false });
  };

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex justify-end gap-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="default"
                className="group relative flex items-center gap-2">
                <ListFilter className="h-4 w-4" />
                <span className="text-sm font-medium">Filtros</span>
                {appliedFilterCount > 0 && (
                  <>
                    <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 text-center items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground transition-opacity group-hover:opacity-0">
                      {appliedFilterCount}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-200 text-[9px] font-semibold text-red-700 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label="Limpar filtros">
                      <X className="h-3 w-3" />
                    </button>
                  </>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-sm">
              <SheetHeader>
                <SheetTitle>Filtros</SheetTitle>
                <SheetDescription>
                  Ajuste os filtros para refinar a lista de colaboradores.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Função</Label>
                  <Select
                    value={roleFilter || "all"}
                    onValueChange={handleRoleChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por função" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as funções</SelectItem>
                      <SelectItem value="org_admin">
                        {getRoleLabel("org_admin")}
                      </SelectItem>
                      <SelectItem value="org_master">
                        {getRoleLabel("org_master")}
                      </SelectItem>
                      <SelectItem value="unit_master">
                        {getRoleLabel("unit_master")}
                      </SelectItem>
                      <SelectItem value="unit_user">
                        {getRoleLabel("unit_user")}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Status</Label>
                  <Select
                    value={statusFilter}
                    onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="disabled">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Unidade</Label>
                  <Select value={unitFilter} onValueChange={setUnitFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por unidade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as unidades</SelectItem>
                      <SelectItem value="matriz">Matriz</SelectItem>
                      {availableUnits.map((unit) => (
                        <SelectItem key={unit} value={unit}>
                          {unit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-sm font-semibold">Equipe</Label>
                  <Select value={teamFilter} onValueChange={setTeamFilter}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Filtrar por equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as equipes</SelectItem>
                      <SelectItem value="sem-equipe">Sem equipe</SelectItem>
                      {availableTeams.map((team) => (
                        <SelectItem key={team} value={team}>
                          {team}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => handleClearFilters()}>
                    Limpar filtros
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          {(canPlatform || authContext?.orgRole === "org_admin") &&
            authContext?.orgId && <NewUserModal />}
        </div>
      </div>

      {/* Tabela (desktop) */}
      <div className="rounded-md border hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 text-left">
              <TableHead className="px-4 py-3">Nome</TableHead>
              <TableHead className="px-4 py-3">Função</TableHead>
              <TableHead className="px-4 py-3">Unidade</TableHead>
              <TableHead className="px-4 py-3">Equipe</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="px-4 py-6 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2 justify-center">
                    <div className="flex items-center justify-center text-muted-foreground bg-white border border-muted rounded-lg shadow-md h-12 w-12 mb-3">
                      <UserRoundX />
                    </div>
                    <span>Nenhum usuário encontrado.</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user: any) => (
                <TableRow key={user.id} className="border-t">
                  {/* Nome / Cargo */}
                  <TableCell className="px-4 py-3">
                    <UserSummary
                      avatarUrl={user.avatar_url}
                      name={user.full_name ?? user.email}
                      subtitle={user.employee_cargo}
                      fallback={user.email}
                    />
                  </TableCell>

                  {/* Função (role) */}
                  <TableCell className="px-4 py-3">
                    <Badge
                      variant={
                        user.org_role === "org_admin"
                          ? "default"
                          : user.global_role === PLATFORM_ADMIN
                          ? "secondary"
                          : "outline"
                      }>
                      {getDisplayRole(user)}
                    </Badge>
                  </TableCell>

                  {/* Unidade */}
                  <TableCell className="px-4 py-3">
                    {user.unit_names && user.unit_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.unit_names.map(
                          (unitName: string, index: number) => (
                            <span key={`${unitName}-${index}`}>{unitName}</span>
                          )
                        )}
                      </div>
                    ) : (
                      <span>Matriz</span>
                    )}
                  </TableCell>

                  {/* Equipe */}
                  <TableCell className="px-4 py-3">
                    {Array.isArray(user.team_names) &&
                    user.team_names.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.team_names.map((team: string, index: number) => (
                          <span key={`${team}-${index}`}>{team}</span>
                        ))}
                      </div>
                    ) : (
                      <span>Sem equipe</span>
                    )}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-4 py-3">
                    {user?.disabled ? (
                      <Badge variant="destructive">Desativado</Badge>
                    ) : (
                      <Badge variant="green">Ativo</Badge>
                    )}
                  </TableCell>

                  {/* Ações */}
                  <TableCell className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="p-2 hover:bg-muted rounded-md"
                          variant="ghost"
                          size="icon-sm">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {/* Editar */}
                        <DropdownMenuItem
                          className="flex items-center gap-2 cursor-pointer"
                          onSelect={() => {
                            router.push(`/users/${user.id}/edit`);
                          }}>
                          <Pencil className="h-4 w-4" />
                          Editar
                        </DropdownMenuItem>

                        {/* Ações perigosas - escondidas para platform_admin */}
                        {!isPlatformAdminProfile(user) && (
                          <>
                            <DropdownMenuItem asChild>
                              {user?.disabled ? (
                                <EnableUserDialog
                                  userId={user.id}
                                  userName={user.full_name ?? user.email}
                                  trigger={
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2">
                                      <UserCheck className="h-4 w-4" />
                                      Ativar
                                    </button>
                                  }
                                  onSuccess={() => router.refresh()}
                                />
                              ) : (
                                <DisableUserDialog
                                  userId={user.id}
                                  userName={user.full_name ?? user.email}
                                  trigger={
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2">
                                      <UserX className="h-4 w-4" />
                                      Desativar
                                    </button>
                                  }
                                  onSuccess={() => router.refresh()}
                                />
                              )}
                            </DropdownMenuItem>

                            {canDeleteUsers && (
                              <DropdownMenuItem asChild>
                                <DeleteUserDialog
                                  userId={user.id}
                                  userName={user.full_name ?? user.email}
                                  trigger={
                                    <button
                                      type="button"
                                      className="w-full flex items-center gap-2 text-destructive">
                                      <Trash className="h-4 w-4" />
                                      Remover
                                    </button>
                                  }
                                  onSuccess={() => router.refresh()}
                                />
                              </DropdownMenuItem>
                            )}
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

      {/* Cards responsivos (mobile) */}
      <div className="sm:hidden space-y-4">
        {filteredUsers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            <UserRoundX className="mx-auto mb-3 h-8 w-8" />
            Nenhum usuário encontrado.
          </div>
        ) : (
          filteredUsers.map((user: any) => (
            <div
              key={user.id}
              className="rounded-lg border p-4 space-y-3 bg-white shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <UserSummary
                  avatarUrl={user.avatar_url}
                  name={user.full_name ?? user.email}
                  subtitle={user.employee_cargo}
                  fallback={user.email}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="p-2 rounded-md">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="flex items-center gap-2 cursor-pointer"
                      onSelect={() => router.push(`/users/${user.id}/edit`)}>
                      <Pencil className="h-4 w-4" />
                      Editar
                    </DropdownMenuItem>

                    {!isPlatformAdminProfile(user) && (
                      <>
                        <DropdownMenuItem asChild>
                          {user?.disabled ? (
                            <EnableUserDialog
                              userId={user.id}
                              userName={user.full_name ?? user.email}
                              trigger={
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2">
                                  <UserCheck className="h-4 w-4" />
                                  Ativar
                                </button>
                              }
                              onSuccess={() => router.refresh()}
                            />
                          ) : (
                            <DisableUserDialog
                              userId={user.id}
                              userName={user.full_name ?? user.email}
                              trigger={
                                <button
                                  type="button"
                                  className="flex w-full items-center gap-2">
                                  <UserX className="h-4 w-4" />
                                  Desativar
                                </button>
                              }
                              onSuccess={() => router.refresh()}
                            />
                          )}
                        </DropdownMenuItem>

                        {canDeleteUsers && (
                          <DropdownMenuItem asChild>
                            <DeleteUserDialog
                              userId={user.id}
                              userName={user.full_name ?? user.email}
                              trigger={
                                <button
                                  type="button"
                                  className="w-full flex items-center gap-2 text-destructive">
                                  <Trash className="h-4 w-4" />
                                  Remover
                                </button>
                              }
                              onSuccess={() => router.refresh()}
                            />
                          </DropdownMenuItem>
                        )}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex flex-wrap gap-2">
                {user.org_role ? (
                  <Badge
                    variant={
                      user.org_role === "org_admin"
                        ? "default"
                        : user.global_role === PLATFORM_ADMIN
                        ? "secondary"
                        : "outline"
                    }>
                    {getRoleLabel(user.org_role)}
                  </Badge>
                ) : null}
                <Badge variant={user?.disabled ? "destructive" : "green"}>
                  {user?.disabled ? "Desativado" : "Ativo"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">Unidade: </span>
                  {Array.isArray(user.unit_names) && user.unit_names.length
                    ? user.unit_names.join(", ")
                    : "Matriz"}
                </div>
                <div>
                  <span className="font-medium text-foreground">Equipe: </span>
                  {Array.isArray(user.team_names) && user.team_names.length
                    ? user.team_names.join(", ")
                    : "Sem equipe"}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
