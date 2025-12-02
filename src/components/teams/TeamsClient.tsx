"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Pencil,
  Trash,
  EllipsisVertical,
  CirclePlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/role-labels";
import UserSummary from "@/components/shared/user-summary";

import TeamDialog from "./TeamDialog";
import type { OrgUserOption, TeamMemberSummary, TeamSummary } from "./types";
import { UserListPopover } from "@/components/shared/user-list-popover";

type Props = {
  canManage: boolean;
  initialTeams: TeamSummary[];
  orgUsers: OrgUserOption[];
};

export default function TeamsClient({
  canManage,
  initialTeams,
  orgUsers,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const [teams, setTeams] = useState<TeamSummary[]>(initialTeams);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [dialogTeamId, setDialogTeamId] = useState<string | null>(null);
  const [dialogTeamName, setDialogTeamName] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    setTeams(initialTeams);
  }, [initialTeams]);

  const disableCreate = !canManage || orgUsers.length === 0;

  async function handleDelete(teamId?: string) {
    const targetId = teamId ?? deleteTarget?.id;
    if (!targetId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/equipes/${targetId}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "Não foi possível excluir a equipe.");
      }
      toast({
        title: "Equipe excluída",
        description: "A equipe foi removida.",
      });
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao excluir equipe.";
      toast({
        title: "Erro ao excluir equipe",
        description: message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  function openDelete(team: TeamSummary) {
    setDeleteTarget({ id: team.id, name: team.name });
  }

  function openCreateDialog() {
    setDialogMode("create");
    setDialogTeamId(null);
    setDialogTeamName(null);
  }

  function openEditDialog(team: TeamSummary) {
    // Defer to allow the dropdown menu to close before opening the dialog,
    // avoiding the Radix click-outside handler closing it immediately.
    setTimeout(() => {
      setDialogMode("edit");
      setDialogTeamId(team.id);
      setDialogTeamName(team.name);
    }, 0);
  }

  function closeDialog() {
    setDialogMode(null);
    setDialogTeamId(null);
    setDialogTeamName(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h3>Estrutura organizacional</h3>
          <p className="text-sm text-muted-foreground">
            As equipes devem refletir o organograma da empresa
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreateDialog} disabled={disableCreate}>
            <CirclePlus />
            Criar equipe
          </Button>
        ) : null}
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed bg-white p-10 text-center">
          <Users className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium">
              Você ainda não tem equipes criadas.
            </p>
            {canManage ? (
              <p className="text-sm text-muted-foreground">
                Crie uma equipe para começar a organizar seus usuários.
              </p>
            ) : null}
          </div>
          {canManage ? (
            <Button
              variant="outline"
              onClick={openCreateDialog}
              disabled={disableCreate}>
              Criar equipe
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          {/* Mobile list (sm and below) */}
          <div className="space-y-3 sm:hidden">
            {teams.map((team) => {
              const leaderInfo = orgUsers.find(
                (user) => user.id === team.leaderId
              );
              return (
                <div
                  key={team.id}
                  className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-6">
                    <div className="space-y-1">
                      <p className="text-lg font-semibold">{team.name}</p>
                      {team.updatedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Atualizado em{" "}
                          {new Date(team.updatedAt).toLocaleDateString("pt-BR")}
                        </p>
                      ) : null}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={!canManage}>
                          <EllipsisVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          disabled={!canManage}
                          onClick={() => openEditDialog(team)}>
                          <Pencil />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={!canManage}
                          onClick={() => openDelete(team)}>
                          <Trash />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserSummary
                        avatarUrl={team.leaderAvatarUrl}
                        name={team.leaderName ?? "Sem líder"}
                        subtitle={
                          leaderInfo
                            ? getRoleLabel(leaderInfo.role)
                            : team.leaderId
                            ? "Usuário da organização"
                            : "—"
                        }
                        fallback="L"
                      />
                    </div>

                    <div>
                      <TeamMembersPreview members={team.members} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table (sm and up) */}
          <div className="hidden overflow-hidden rounded-lg border bg-white sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Líder</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => {
                  const leaderInfo = orgUsers.find(
                    (user) => user.id === team.leaderId
                  );
                  return (
                    <TableRow key={team.id}>
                      <TableCell>
                        <p className="text-base font-semibold">{team.name}</p>
                        {team.updatedAt ? (
                          <p className="text-xs text-muted-foreground">
                            Atualizado em:{" "}
                            {new Date(team.updatedAt).toLocaleDateString(
                              "pt-BR"
                            )}
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <UserSummary
                          avatarUrl={team.leaderAvatarUrl}
                          name={team.leaderName ?? "Sem líder"}
                          subtitle={
                            leaderInfo
                              ? getRoleLabel(leaderInfo.role)
                              : team.leaderId
                              ? "Usuário da organização"
                              : "—"
                          }
                          fallback="L"
                        />
                      </TableCell>
                      <TableCell>
                        <TeamMembersPreview members={team.members} />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              disabled={!canManage}>
                              <EllipsisVertical />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              disabled={!canManage}
                              onClick={() => openEditDialog(team)}>
                              <Pencil />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={!canManage}
                              onClick={() => openDelete(team)}>
                              <Trash />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {deleteTarget ? (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir equipe</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja excluir a equipe{" "}
                <span className="font-semibold">{deleteTarget.name}</span>? Essa
                ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                disabled={deleting}
                onClick={() => handleDelete(deleteTarget.id)}>
                {deleting ? "Excluindo..." : "Excluir"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}

      <TeamDialog
        mode={dialogMode ?? "create"}
        open={dialogMode !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
        teamId={dialogMode === "edit" ? dialogTeamId ?? undefined : undefined}
        teamName={
          dialogMode === "edit" ? dialogTeamName ?? undefined : undefined
        }
        orgUsers={orgUsers}
        onSuccess={() => {
          closeDialog();
          router.refresh();
        }}
      />
    </div>
  );
}

function TeamMembersPreview({ members }: { members: TeamMemberSummary[] }) {
  return <UserListPopover users={members} />;
}
