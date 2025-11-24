"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "@/components/communication/RichTextEditor";
import {
  UserMultiSelect,
  type UserOption,
} from "@/components/communication/UserMultiSelect";
import {
  GroupMultiSelect,
  type UserGroupOption,
} from "@/components/communication/GroupMultiSelect";
import {
  TeamMultiSelect,
  type TeamOption,
} from "@/components/communication/TeamMultiSelect";
import { Loader2, Megaphone, X, Send } from "lucide-react";

export function NewAnnouncementModal({
  canCreateAnnouncement = true,
}: {
  canCreateAnnouncement?: boolean;
}) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const totalRecipients = useMemo(
    () => users.length + groups.length + teams.length,
    [groups.length, teams.length, users.length]
  );

  const removeUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== id));
  }, []);

  const removeGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== id));
  }, []);

  const removeTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id));
  }, []);

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setUsers([]);
    setGroups([]);
    setTeams([]);
    setAllowComments(true);
    setAllowReactions(true);
    setSubmitting(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) resetForm();
    },
    [resetForm]
  );

  const disabledReason = canCreateAnnouncement
    ? null
    : "Apenas gestores (org_admin, org_master, unit_master ou platform_admin) podem criar comunicados.";

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast({ title: "Informe um título" });
      return;
    }
    const plainContent = content
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!plainContent) {
      toast({ title: "Conteúdo vazio", description: "Escreva o comunicado." });
      return;
    }
    if (users.length === 0 && groups.length === 0 && teams.length === 0) {
      toast({
        title: "Selecione destinatários",
        description:
          "Escolha usuários, grupos ou equipes para enviar o comunicado.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          allowComments,
          allowReactions,
          userIds: users.map((u) => u.id),
          groupIds: groups.map((g) => g.id),
          teamIds: teams.map((t) => t.id),
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || `HTTP ${res.status}`);
      }

      toast({ title: "Comunicado criado" });
      setOpen(false);
      resetForm();
    } catch (err: any) {
      console.error("NewAnnouncementModal error", err);
      toast({
        title: "Erro ao criar comunicado",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    allowComments,
    allowReactions,
    content,
    groups,
    resetForm,
    teams,
    title,
    toast,
    users,
  ]);

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button
          variant="default"
          className="gap-2"
          disabled={!canCreateAnnouncement}
          title={disabledReason ?? undefined}>
          <Megaphone className="h-4 w-4" />
          Novo comunicado
        </Button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[95vh]">
        <div className="mx-auto flex w-full flex-col overflow-y-auto px-4 pb-8 sm:px-12">
          <DrawerHeader className="px-0 pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle>Enviar comunicado</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar">
                  <X size={22} />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="grid grid-cols-6 gap-12">
            <div className="col-span-4 space-y-6">
              <div className="space-y-6 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="announcement-title">Título</Label>
                  <Input
                    id="announcement-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Assunto do comunicado"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conteúdo</Label>
                  <RichTextEditor
                    value={content}
                    onChange={setContent}
                    placeholder="Escreva o comunicado..."
                  />
                </div>
                <SelectedRecipients
                  users={users}
                  groups={groups}
                  teams={teams}
                  onRemoveUser={removeUser}
                  onRemoveGroup={removeGroup}
                  onRemoveTeam={removeTeam}
                  total={totalRecipients}
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <Switch
                    checked={allowComments}
                    onCheckedChange={(checked) =>
                      setAllowComments(Boolean(checked))
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">
                      Permitir comentários
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Os destinatários poderão comentar (sem threads).
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 rounded-lg border border-border p-4">
                  <Switch
                    checked={allowReactions}
                    onCheckedChange={(checked) =>
                      setAllowReactions(Boolean(checked))
                    }
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">Permitir reações</p>
                    <p className="text-xs text-muted-foreground">
                      Emojis de reação habilitados para este comunicado.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-2 flex flex-col gap-6">
              <Tabs defaultValue="users" className="space-y-4">
                <TabsList className="grid grid-cols-3">
                  <TabsTrigger value="users">Usuários</TabsTrigger>
                  <TabsTrigger value="groups">Grupos</TabsTrigger>
                  <TabsTrigger value="teams">Equipes</TabsTrigger>
                </TabsList>
                <TabsContent value="users" className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Pesquise e selecione usuários específicos.
                  </p>
                  <UserMultiSelect
                    value={users}
                    onChange={setUsers}
                    apiBase="/api/comunicados/recipients"
                    showSelectedSummary={false}
                  />
                </TabsContent>
                <TabsContent value="groups" className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Adicione grupos para incluir todos os membros
                    automaticamente.
                  </p>
                  <GroupMultiSelect
                    value={groups}
                    onChange={setGroups}
                    apiBase="/api/comunicados/recipients"
                    showSelectedSummary={false}
                  />
                </TabsContent>
                <TabsContent value="teams" className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Selecione equipes para incluir todos os participantes.
                  </p>
                  <TeamMultiSelect
                    value={teams}
                    onChange={setTeams}
                    apiBase="/api/comunicados/recipients"
                    showSelectedSummary={false}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Selecionados: {totalRecipients} (usuários, grupos e equipes)
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Send />
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type SelectedRecipientsProps = {
  users: UserOption[];
  groups: UserGroupOption[];
  teams: TeamOption[];
  total: number;
  onRemoveUser: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  onRemoveTeam: (id: string) => void;
};

function SelectedRecipients({
  users,
  groups,
  teams,
  total,
  onRemoveUser,
  onRemoveGroup,
  onRemoveTeam,
}: SelectedRecipientsProps) {
  if (!users.length && !groups.length && !teams.length) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
        Nenhum destinatário selecionado ainda. Utilize as abas à direita para
        adicionar usuários, grupos ou equipes.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border px-4 py-3">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>Destinatários selecionados</span>
        <span className="text-xs text-muted-foreground">{total} no total</span>
      </div>
      {users.length ? (
        <RecipientBadgeList
          label="Usuários"
          items={users.map((u) => ({ id: u.id, label: u.full_name || u.id }))}
          onRemove={onRemoveUser}
        />
      ) : null}
      {groups.length ? (
        <RecipientBadgeList
          label="Grupos"
          items={groups.map((g) => ({ id: g.id, label: g.name }))}
          onRemove={onRemoveGroup}
        />
      ) : null}
      {teams.length ? (
        <RecipientBadgeList
          label="Equipes"
          items={teams.map((t) => ({ id: t.id, label: t.name }))}
          onRemove={onRemoveTeam}
        />
      ) : null}
    </div>
  );
}

function RecipientBadgeList({
  label,
  items,
  onRemove,
}: {
  label: string;
  items: { id: string; label: string }[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item.id} variant="secondary" className="gap-2">
            {item.label}
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              onClick={() => onRemove(item.id)}>
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        ))}
      </div>
    </div>
  );
}
