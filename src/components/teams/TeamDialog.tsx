import { useEffect, useMemo, useState } from "react";
import { Shield, Users } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { getRoleLabel } from "@/lib/role-labels";
import { useToast } from "@/hooks/use-toast";

import type { OrgUserOption } from "./types";
import UserSummary from "@/components/shared/user-summary";
import { Toggle } from "@/components/ui/toggle";

type TeamDialogProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgUsers: OrgUserOption[];
  teamId?: string;
  teamName?: string;
  onSuccess?: () => void;
};

type TeamDetails = {
  id: string;
  name: string;
  leader: string;
  members: string[];
};

export default function TeamDialog({
  mode,
  open,
  onOpenChange,
  orgUsers,
  teamId,
  teamName,
  onSuccess,
}: TeamDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [team, setTeam] = useState<TeamDetails | null>(null);
  const [name, setName] = useState("");
  const [leaderId, setLeaderId] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    () => new Set()
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      setName("");
      setLeaderId("");
      setSelectedMembers(new Set());
      setTeam(null);
      setSearch("");
      setLoading(false);
      setSubmitting(false);
      return;
    }

    if (mode === "edit" && teamId) {
      setLoading(true);
      fetch(`/api/equipes/${teamId}`)
        .then(async (res) => {
          const payload = await res.json();
          if (!res.ok) {
            throw new Error(payload?.error ?? "Falha ao carregar equipe.");
          }
          const details: TeamDetails = {
            id: payload.item.id,
            name: payload.item.name,
            leader: payload.item.leader,
            members: payload.item.members ?? [],
          };
          setTeam(details);
          setName(details.name);
          setLeaderId(details.leader);
          setSelectedMembers(new Set(details.members));
        })
        .catch((error) => {
          toast({
            title: "Erro ao carregar equipe",
            description:
              error instanceof Error
                ? error.message
                : "Falha ao carregar equipe.",
            variant: "destructive",
          });
          onOpenChange(false);
        })
        .finally(() => setLoading(false));
    } else {
      setName("");
      setLeaderId("");
      const next = new Set<string>();
      if (orgUsers.length > 0) {
        next.add(orgUsers[0].id);
        setLeaderId(orgUsers[0].id);
      }
      setSelectedMembers(next);
    }
  }, [open, mode, teamId, orgUsers, toast, onOpenChange]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    if (!normalizedSearch) return orgUsers;
    return orgUsers.filter((user) => {
      const needle = normalizedSearch;
      return (
        user.name.toLowerCase().includes(needle) ||
        (user.email ?? "").toLowerCase().includes(needle) ||
        (user.title ?? "").toLowerCase().includes(needle)
      );
    });
  }, [orgUsers, normalizedSearch]);

  function toggleMember(userId: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        if (leaderId === userId) {
          toast({
            title: "Selecione outro líder antes de remover este membro.",
            description:
              "O líder sempre precisa permanecer selecionado ou seja substituído antes da remoção.",
          });
          return prev;
        }
        next.delete(userId);
        return next;
      }
      next.add(userId);
      if (!leaderId) setLeaderId(userId);
      return next;
    });
  }

  const canSubmit =
    !!name.trim() &&
    selectedMembers.size > 0 &&
    leaderId !== "" &&
    selectedMembers.has(leaderId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !canSubmit) return;

    setSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        leader: leaderId,
        members: Array.from(selectedMembers),
      };
      const res =
        mode === "create"
          ? await fetch("/api/equipes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/equipes/${teamId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          json?.error ??
            (mode === "create"
              ? "Não foi possível criar a equipe."
              : "Não foi possível atualizar a equipe.")
        );
      }

      toast({
        title: mode === "create" ? "Equipe criada" : "Equipe atualizada",
        description:
          mode === "create"
            ? "A equipe foi criada com sucesso."
            : "As alterações foram salvas com sucesso.",
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title:
          mode === "create"
            ? "Erro ao criar equipe"
            : "Erro ao atualizar equipe",
        description:
          error instanceof Error
            ? error.message
            : mode === "create"
            ? "Falha ao criar equipe."
            : "Falha ao atualizar equipe.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const membersCount = selectedMembers.size;
  const isReadOnly = mode === "edit" && (loading || !team);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {mode === "create"
              ? "Criar equipe"
              : team
              ? `Editar equipe “${team.name}”`
              : teamName
              ? `Editar equipe “${teamName}”`
              : "Editar equipe"}
          </DialogTitle>
        </DialogHeader>
        {isReadOnly ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-6">
            <Spinner />
            <p className="text-sm text-muted-foreground">
              Carregando dados da equipe...
            </p>
          </div>
        ) : orgUsers.length === 0 ? (
          <div className="flex  min-h-[200px] flex-col items-center justify-center gap-3 py-6 text-center text-sm text-muted-foreground">
            <Users size={20} />
            <p>
              Nenhum usuário disponível nesta organização. Adicione usuários
              antes de criar uma equipe.
            </p>
          </div>
        ) : (
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="team-name">Nome</Label>
              <Input
                id="team-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marketing, Comercial, Sucesso do Cliente..."
                disabled={submitting}
              />
            </div>

            <div className="space-y-3">
              <div className="mb-4 space-y-1">
                <div className="flex gap-1 items-center">
                  <h5>Membros da equipe </h5>
                  <span className="text-lg text-light leading-[1.5rem]">
                    {membersCount > 0 ? `(${membersCount})` : ""}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Selecione um Líder e os membros que farão parte desta equipe
                </p>
              </div>

              <Input
                placeholder="Buscar por nome ou cargo"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={submitting}
              />

              <ScrollArea className="h-64 rounded-md border">
                <div
                  className="divide-y"
                  role="group"
                  aria-label="Selecionar líder da equipe">
                  {filteredUsers.length === 0 ? (
                    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                      Nenhum usuário encontrado.
                    </div>
                  ) : (
                    filteredUsers.map((user) => {
                      const checked = selectedMembers.has(user.id);
                      const disabled = submitting;
                      const isLeader = leaderId === user.id;
                      return (
                        <div
                          key={user.id}
                          className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-3 px-4 py-3 transition hover:bg-muted/60 ${
                            !checked ? "opacity-75" : ""
                          }`}>
                          <div className="flex flex-1 items-center gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleMember(user.id)}
                              disabled={disabled}
                            />
                            <div className="flex flex-1">
                              <UserSummary
                                avatarUrl={user.avatarUrl}
                                name={user.name}
                                subtitle={user.title ?? "Sem cargo"}
                                fallback="Sem nome"
                              />
                            </div>
                            <Badge variant="outline">
                              {user.role ? getRoleLabel(user.role) : "Membro"}
                            </Badge>
                          </div>
                          <div className="flex justify-center items-center gap-2">
                            <Toggle
                              aria-label={`Definir ${user.name} como líder`}
                              pressed={isLeader}
                              onPressedChange={(pressed) => {
                                if (!selectedMembers.has(user.id)) {
                                  toast({
                                    title: "Selecione o membro primeiro",
                                    description:
                                      "Para definir alguém como líder, selecione-o como membro.",
                                  });
                                  return;
                                }
                                if (!pressed) return;
                                setLeaderId(user.id);
                              }}
                              disabled={
                                !selectedMembers.has(user.id) || submitting
                              }
                              className="h-8 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                              <Shield className="h-4 w-4" />
                              <span className="ml-1 font-medium">Líder</span>
                            </Toggle>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
