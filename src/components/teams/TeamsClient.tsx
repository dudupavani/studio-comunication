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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/role-labels";

import TeamDialog from "./TeamDialog";
import type { OrgUserOption, TeamMemberSummary, TeamSummary } from "./types";

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
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipes</h1>
          <p className="text-sm text-muted-foreground">
            Crie equipes internas, defina membros e escolha o líder de cada
            time.
          </p>
        </div>
        {canManage ? (
          <Button onClick={openCreateDialog} disabled={disableCreate}>
            <CirclePlus />
            Criar
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
        <div className="overflow-hidden rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Líder</TableHead>
                <TableHead>Qtd. membros</TableHead>
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
                      <p className="font-medium text-gray-900">{team.name}</p>
                      {team.updatedAt ? (
                        <p className="text-xs text-muted-foreground">
                          Atualizado em{" "}
                          {new Date(team.updatedAt).toLocaleDateString("pt-BR")}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={team.leaderAvatarUrl ?? undefined}
                          />
                          <AvatarFallback>
                            {team.leaderName?.charAt(0).toUpperCase() ?? "L"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {team.leaderName ?? "Sem líder"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {leaderInfo
                              ? getRoleLabel(leaderInfo.role)
                              : team.leaderId
                              ? "Usuário da organização"
                              : "—"}
                          </span>
                        </div>
                      </div>
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
  if (!members.length) {
    return (
      <span className="text-xs font-medium text-muted-foreground">
        Sem membros
      </span>
    );
  }

  const preview = members.slice(0, 3);
  const remaining = members.length - preview.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md bg-transparent border border-transparent px-2 py-1 transition hover:bg-white hover:border-gray-200">
          <div className="flex -space-x-3">
            {preview.map((member) => (
              <Avatar
                key={member.id}
                className="h-8 w-8 border-2 border-white ">
                <AvatarImage src={member.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {getInitials(member.name) ?? "?"}
                </AvatarFallback>
              </Avatar>
            ))}
            {remaining > 0 ? (
              <div className="flex items-center justify-center">
                +{remaining}
              </div>
            ) : null}
          </div>
          <Badge variant="secondary">{members.length}</Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start" sideOffset={8}>
        <div className="max-h-64 space-y-3 overflow-y-auto">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {getInitials(member.name) ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">
                  {member.name ?? "Sem nome"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function getInitials(name?: string | null) {
  if (!name) return "??";
  const trimmed = name.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  const initials = `${first}${second}`.toUpperCase();
  return initials || trimmed[0]?.toUpperCase() || "??";
}
