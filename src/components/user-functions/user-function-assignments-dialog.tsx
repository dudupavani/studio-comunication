"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import type { UserFunctionBaseRole } from "@/lib/permissions/user-functions";
import { getRoleLabel } from "@/lib/role-labels";

type PermissionProfile = {
  id: string;
  name: string;
  baseRole: UserFunctionBaseRole;
  userIds: string[];
};

type EligibleUser = {
  id: string;
  role: UserFunctionBaseRole;
  name: string;
  cargo: string | null;
  assignedProfileId: string | null;
};

type UserFunctionAssignmentsDialogProps = {
  profile: PermissionProfile;
  profiles: PermissionProfile[];
  users: EligibleUser[];
  saving: boolean;
  trigger: ReactNode;
  onSave: (userIds: string[]) => Promise<void>;
};

export function UserFunctionAssignmentsDialog({
  profile,
  profiles,
  users,
  saving,
  trigger,
  onSave,
}: UserFunctionAssignmentsDialogProps) {
  const [open, setOpen] = useState(false);
  const [assignmentUserIds, setAssignmentUserIds] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [cargoFilter, setCargoFilter] = useState("__all__");
  const [cargoSearch, setCargoSearch] = useState("");
  const [pendingMoveUser, setPendingMoveUser] = useState<EligibleUser | null>(
    null
  );

  useEffect(() => {
    if (!open) return;
    setAssignmentUserIds(profile.userIds);
    setUserSearch("");
    setCargoFilter("__all__");
    setCargoSearch("");
  }, [open, profile.id, profile.userIds]);

  const eligibleUsers = useMemo(
    () => users.filter((user) => user.role === profile.baseRole),
    [profile.baseRole, users]
  );
  const assignmentUserIdSet = new Set(assignmentUserIds);
  const profileNameById = new Map(
    profiles.map((profileItem) => [profileItem.id, profileItem.name])
  );
  const availableCargos = Array.from(
    new Set(
      eligibleUsers
        .map((user) => user.cargo?.trim())
        .filter((cargo): cargo is string => Boolean(cargo))
    )
  ).sort((a, b) => a.localeCompare(b));
  const filteredCargos = availableCargos.filter((cargo) =>
    cargo.toLowerCase().includes(cargoSearch.trim().toLowerCase())
  );
  const filteredAssignmentUsers = eligibleUsers.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      user.name.toLowerCase().includes(search) ||
      (user.cargo ?? "").toLowerCase().includes(search);
    const matchesCargo =
      cargoFilter === "__all__" || (user.cargo ?? "") === cargoFilter;

    return matchesSearch && matchesCargo;
  });
  const assignmentSummary = {
    added: assignmentUserIds.filter((userId) => !profile.userIds.includes(userId))
      .length,
    removed: profile.userIds.filter((userId) => !assignmentUserIds.includes(userId))
      .length,
    moved: assignmentUserIds.filter((userId) => {
      const user = users.find((item) => item.id === userId);
      return user?.assignedProfileId && user.assignedProfileId !== profile.id;
    }).length,
  };

  function toggleAssignmentUser(user: EligibleUser, checked: boolean) {
    if (!checked) {
      setAssignmentUserIds((current) =>
        current.filter((userId) => userId !== user.id)
      );
      return;
    }

    if (user.assignedProfileId && user.assignedProfileId !== profile.id) {
      setPendingMoveUser(user);
      return;
    }

    setAssignmentUserIds((current) =>
      current.includes(user.id) ? current : [...current, user.id]
    );
  }

  function confirmMoveUser() {
    if (!pendingMoveUser) return;
    setAssignmentUserIds((current) =>
      current.includes(pendingMoveUser.id)
        ? current
        : [...current, pendingMoveUser.id]
    );
    setPendingMoveUser(null);
  }

  async function saveAssignments() {
    await onSave(assignmentUserIds);
    setOpen(false);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Usuarios da funcao</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_260px]">
              <div className="grid gap-2">
                <Label htmlFor="user-function-search">Buscar</Label>
                <Input
                  id="user-function-search"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Nome ou cargo"
                />
              </div>
              <div className="grid gap-2">
                <Label>Cargo</Label>
                <Select value={cargoFilter} onValueChange={setCargoFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        value={cargoSearch}
                        onChange={(event) => setCargoSearch(event.target.value)}
                        placeholder="Buscar cargo"
                      />
                    </div>
                    <SelectItem value="__all__">Todos os cargos</SelectItem>
                    {filteredCargos.map((cargo) => (
                      <SelectItem key={cargo} value={cargo}>
                        {cargo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="max-h-[420px] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Funcao atual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAssignmentUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center">
                        {eligibleUsers.length === 0
                          ? `Nenhum usuario com role ${getRoleLabel(
                              profile.baseRole
                            )}.`
                          : "Nenhum usuario encontrado para os filtros."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAssignmentUsers.map((user) => {
                      const checked = assignmentUserIdSet.has(user.id);
                      const assignedElsewhere =
                        user.assignedProfileId &&
                        user.assignedProfileId !== profile.id;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                toggleAssignmentUser(user, Boolean(value))
                              }
                            />
                          </TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.cargo ?? "-"}</TableCell>
                          <TableCell>
                            {user.assignedProfileId
                              ? profileNameById.get(user.assignedProfileId) ??
                                "Outra funcao"
                              : "Funcao global"}
                            {assignedElsewhere ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                sera movido se selecionado
                              </span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-sm text-muted-foreground">
              {assignmentSummary.added} adicionados, {assignmentSummary.removed}{" "}
              removidos, {assignmentSummary.moved} movidos de outra funcao.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={saveAssignments} disabled={saving}>
              Salvar usuarios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(pendingMoveUser)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setPendingMoveUser(null);
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover usuario?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingMoveUser?.name} ja esta em{" "}
              {pendingMoveUser?.assignedProfileId
                ? profileNameById.get(pendingMoveUser.assignedProfileId) ??
                  "outra funcao"
                : "outra funcao"}
              . Ao confirmar, ele sera movido para esta funcao quando voce
              salvar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMoveUser} disabled={saving}>
              Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
