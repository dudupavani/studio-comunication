"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Save, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

function defaultPermissionsForRole(role: UserFunctionBaseRole) {
  if (role === "org_master") return DEFAULT_ORG_MASTER_PERMISSIONS;
  return [];
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

  async function saveProfile() {
    if (!selectedProfile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user-functions/${selectedProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedProfile.name,
          permissions: selectedProfile.permissions,
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

  async function saveAssignments() {
    if (!selectedProfile) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/user-functions/${selectedProfile.id}/assignments`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedProfile.userIds }),
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

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2>Funcoes</h2>
              <p className="text-sm text-muted-foreground">
                Perfis de permissao da organizacao.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={loadData}
              disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button disabled={allowedBaseRoles.length === 0}>
                <Plus className="h-4 w-4" />
                Funcao
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
                            {getRoleLabel(role)}
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
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : profiles.length === 0 ? (
            <div className="rounded-md border border-dashed p-4">
              <p className="text-sm text-muted-foreground">
                Nenhuma funcao personalizada criada.
              </p>
            </div>
          ) : (
            <div className="grid gap-2">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => setSelectedProfileId(profile.id)}
                  className={`rounded-md border p-3 text-left transition-colors ${
                    selectedProfileId === profile.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}>
                  <span className="block text-sm font-medium">{profile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {getRoleLabel(profile.baseRole)} - {profile.userIds.length} usuarios
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        {selectedProfile ? (
          <>
            <CardHeader className="gap-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="grid gap-2">
                  <Label htmlFor="function-name">Nome da funcao</Label>
                  <Input
                    id="function-name"
                    value={selectedProfile.name}
                    onChange={(event) =>
                      updateSelectedProfile((profile) => ({
                        ...profile,
                        name: event.target.value,
                      }))
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Role base: {getRoleLabel(selectedProfile.baseRole)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={saveProfile} disabled={saving}>
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="destructive" disabled={saving}>
                        <Trash2 className="h-4 w-4" />
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
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <section className="grid gap-3">
                <h3>Permissoes</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {USER_FUNCTION_PERMISSION_CATALOG.map((permission) => {
                    const checked = selectedPermissions.includes(permission.key);
                    return (
                      <label
                        key={permission.key}
                        className="flex items-start gap-3 rounded-md border p-3">
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

              <section className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3>Usuarios atribuidos</h3>
                    <p className="text-sm text-muted-foreground">
                      Apenas usuarios com o mesmo role tecnico podem receber esta
                      funcao.
                    </p>
                  </div>
                  <Button type="button" onClick={saveAssignments} disabled={saving}>
                    Salvar usuarios
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {eligibleUsers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-6 text-center">
                            Nenhum usuario elegivel para esta funcao.
                          </TableCell>
                        </TableRow>
                      ) : (
                        eligibleUsers.map((user) => {
                          const checked = selectedUserIds.includes(user.id);
                          return (
                            <TableRow key={user.id}>
                              <TableCell>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) =>
                                    updateSelectedProfile((profile) => ({
                                      ...profile,
                                      userIds: value
                                        ? [...profile.userIds, user.id]
                                        : profile.userIds.filter(
                                            (userId) => userId !== user.id
                                          ),
                                    }))
                                  }
                                />
                              </TableCell>
                              <TableCell>{user.name}</TableCell>
                              <TableCell>{getRoleLabel(user.role)}</TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </CardContent>
          </>
        ) : (
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              Selecione ou crie uma funcao para configurar permissoes.
            </p>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
