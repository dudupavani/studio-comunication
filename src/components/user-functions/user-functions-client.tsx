"use client";

import { useEffect, useMemo, useState } from "react";
import { CirclePlus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineEditableText } from "@/components/ui/inline-editable-text";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  DEFAULT_ORG_MASTER_PERMISSIONS,
  USER_FUNCTION_PERMISSION_CATALOG,
  type UserFunctionBaseRole,
  type UserFunctionPermissionKey,
} from "@/lib/permissions/user-functions";
import { getRoleLabel } from "@/lib/role-labels";
import { UserFunctionAssignmentsDialog } from "./user-function-assignments-dialog";

type PermissionProfile = {
  id: string;
  name: string;
  baseRole: UserFunctionBaseRole;
  permissions: UserFunctionPermissionKey[];
  userIds: string[];
};

type EligibleUser = {
  id: string;
  role: UserFunctionBaseRole;
  name: string;
  avatarUrl: string | null;
  globalRole: string | null;
  cargo: string | null;
  assignedProfileId: string | null;
};

type ApiPayload = {
  ok: boolean;
  allowedBaseRoles: UserFunctionBaseRole[];
  profiles: PermissionProfile[];
  users: EligibleUser[];
};

const roleOptions: UserFunctionBaseRole[] = [
  "org_master",
  "unit_master",
  "unit_user",
];

const permissionModules = USER_FUNCTION_PERMISSION_CATALOG.reduce<
  Array<{
    name: string;
    permissions: typeof USER_FUNCTION_PERMISSION_CATALOG;
  }>
>((modules, permission) => {
  const permissionGroup = modules.find(
    (item) => item.name === permission.module
  );
  if (permissionGroup) {
    permissionGroup.permissions.push(permission);
  } else {
    modules.push({
      name: permission.module,
      permissions: [permission],
    });
  }
  return modules;
}, []);

function defaultPermissionsForRole(_role: UserFunctionBaseRole) {
  return DEFAULT_ORG_MASTER_PERMISSIONS;
}

export default function UserFunctionsClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [users, setUsers] = useState<EligibleUser[]>([]);
  const [allowedBaseRoles, setAllowedBaseRoles] = useState<UserFunctionBaseRole[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBaseRole, setNewBaseRole] = useState<UserFunctionBaseRole>("org_master");

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) ?? null,
    [profiles, selectedProfileId]
  );

  const selectedUserIds = selectedProfile?.userIds ?? [];
  const selectedPermissions = selectedProfile?.permissions ?? [];
  const userCountByRole = new Map<UserFunctionBaseRole, number>(
    roleOptions.map((role) => [
      role,
      users.filter((user) => user.role === role).length,
    ])
  );

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/user-functions", { cache: "no-store" });
      const payload = (await res.json().catch(() => null)) as ApiPayload | null;
      if (!res.ok || !payload?.ok) {
        throw new Error((payload as any)?.error ?? "Falha ao carregar funcoes.");
      }
      setProfiles(payload.profiles);
      setUsers(payload.users);
      setAllowedBaseRoles(payload.allowedBaseRoles);
      setSelectedProfileId((current) => {
        if (current && payload.profiles.some((profile) => profile.id === current)) {
          return current;
        }
        return payload.profiles[0]?.id ?? null;
      });
      if (payload.allowedBaseRoles[0]) setNewBaseRole(payload.allowedBaseRoles[0]);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao carregar",
        description: error?.message ?? "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateSelectedProfile(updater: (profile: PermissionProfile) => PermissionProfile) {
    if (!selectedProfile) return;
    setProfiles((current) =>
      current.map((profile) =>
        profile.id === selectedProfile.id ? updater(profile) : profile
      )
    );
  }

  async function createProfile() {
    const trimmedName = newName.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/user-functions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          baseRole: newBaseRole,
          permissions: defaultPermissionsForRole(newBaseRole),
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Falha ao criar funcao.");
      }
      toast({ title: "Funcao criada" });
      setNewName("");
      setCreateOpen(false);
      await loadData();
      setSelectedProfileId(payload.profile.id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar",
        description: error?.message ?? "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveProfileChanges(profile: PermissionProfile) {
    setSaving(true);
    try {
      const res = await fetch(`/api/user-functions/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          permissions: profile.permissions,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar funcao.");
      }
      toast({ title: "Funcao salva" });
      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error?.message ?? "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile() {
    if (!selectedProfile) return;
    await saveProfileChanges(selectedProfile);
  }

  async function deleteProfile() {
    if (!selectedProfile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user-functions/${selectedProfile.id}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Falha ao excluir funcao.");
      }
      toast({ title: "Funcao excluida" });
      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error?.message ?? "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  const eligibleUsers = users.filter(
    (user) => selectedProfile && user.role === selectedProfile.baseRole
  );
  const assignedUsers = eligibleUsers.filter((user) =>
    selectedUserIds.includes(user.id)
  );
  async function saveAssignments(userIds: string[]) {
    if (!selectedProfile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user-functions/${selectedProfile.id}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error ?? "Falha ao salvar usuarios.");
      }
      toast({ title: "Usuarios atualizados" });
      await loadData();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar usuarios",
        description: error?.message ?? "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_minmax(0,1fr)_360px]">
      <aside className="border-r border-border px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3>Funções</h3>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={loading || allowedBaseRoles.length === 0}>
              <CirclePlus className="h-4 w-4" />
              Criar
            </Button>
          </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova funcao de usuario</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="new-function-name">Nome</Label>
                  <Input
                    id="new-function-name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    placeholder="Diretor"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Role base</Label>
                  <Select
                    value={newBaseRole}
                    onValueChange={(value) =>
                      setNewBaseRole(value as UserFunctionBaseRole)
                    }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions
                        .filter((role) => allowedBaseRoles.includes(role))
                        .map((role) => (
                          <SelectItem key={role} value={role}>
                            {getRoleLabel(role)} ({userCountByRole.get(role) ?? 0} usuarios)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                  disabled={saving}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={createProfile}
                  disabled={saving || !newName.trim()}>
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
        </Dialog>
      </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : profiles.length === 0 ? (
          <div className="rounded-md border border-dashed p-4">
            <p className="text-sm text-muted-foreground">
              Nenhuma funcao personalizada criada.
            </p>
          </div>
        ) : (
          <div className="grid gap-1">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                type="button"
                onClick={() => setSelectedProfileId(profile.id)}
                className={`rounded-md px-3 py-2 text-left transition-colors cursor-pointer ${
                  selectedProfileId === profile.id
                    ? "bg-secondary"
                    : "hover:bg-muted"
                }`}>
                <span className="block text-sm font-medium">{profile.name}</span>
                <span className="text-xs text-muted-foreground">
                  {getRoleLabel(profile.baseRole)} - {profile.userIds.length} usuarios
                </span>
              </button>
            ))}
          </div>
        )}
      </aside>

      {selectedProfile ? (
        <>
          <main className="min-h-0 space-y-8 overflow-auto p-6 pb-16 sm:px-10">
            <div className="space-y-4">
              <InlineEditableText
                value={selectedProfile.name}
                size="lg"
                disabled={saving}
                placeholder="Nome da funcao"
                aria-label="Nome da funcao"
                onSave={async (value) => {
                  const nextProfile = {
                    ...selectedProfile,
                    name: value,
                  };
                  updateSelectedProfile((profile) => ({
                    ...profile,
                    name: value,
                  }));
                  await saveProfileChanges(nextProfile);
                }}
              />

            </div>

            <section className="grid gap-5">
              <h2>Permissões</h2>
              <div className="grid gap-6">
                {permissionModules.map((module) => (
                  <section key={module.name} className="grid gap-2">
                    <h5>{module.name}</h5>
                    <div className="divide-y rounded-md border">
                      {module.permissions.map((permission) => {
                        const checked = selectedPermissions.includes(permission.key);
                        return (
                          <label
                            key={permission.key}
                            className="flex items-start gap-3 px-4 py-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                updateSelectedProfile((profile) => ({
                                  ...profile,
                                  permissions: value
                                    ? [...profile.permissions, permission.key]
                                    : profile.permissions.filter(
                                        (item) => item !== permission.key
                                      ),
                                }))
                              }
                            />
                            <span className="grid gap-1">
                              <span className="text-sm font-medium">
                                {permission.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {permission.description}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </section>

            <div className="flex justify-between gap-2pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructiveMuted" disabled={saving}>
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir funcao?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os usuarios vinculados a esta funcao voltarao as
                      permissoes padrao do role tecnico deles.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={saving}>
                      Cancelar
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={deleteProfile} disabled={saving}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button type="button" onClick={saveProfile} disabled={saving}>
                Salvar
              </Button>
            </div>
          </main>

          <aside className="min-h-0 space-y-4 overflow-auto border-l p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4>Usuários</h4>
              </div>
              <UserFunctionAssignmentsDialog
                profile={selectedProfile}
                profiles={profiles}
                users={users}
                saving={saving}
                onSave={saveAssignments}
                trigger={
                  <Button type="button" size="sm" variant="outline" disabled={saving}>
                    <CirclePlus className="h-4 w-4" />
                    Adicionar
                  </Button>
                }
              />
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignedUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={2} className="py-6 text-center">
                        Nenhum usuario atribuido.
                      </TableCell>
                    </TableRow>
                  ) : (
                    assignedUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="grid gap-0.5">
                            <span>{user.name}</span>
                            {user.cargo ? (
                              <span className="text-xs text-muted-foreground">
                                {user.cargo}
                              </span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleLabel(user.role)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </aside>
        </>
      ) : (
        <main>
          <p className="text-sm text-muted-foreground">
            Selecione ou crie uma funcao para configurar permissoes.
          </p>
        </main>
      )}
    </div>
  );
}
