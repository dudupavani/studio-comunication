"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, MessageSquarePlus, Send, X } from "lucide-react";

export function NewMessageModal({
  canCreateConversation = true,
}: {
  canCreateConversation?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const removeUser = useCallback((id: string) => {
    setUsers((prev) => prev.filter((user) => user.id !== id));
  }, []);

  const removeGroup = useCallback((id: string) => {
    setGroups((prev) => prev.filter((group) => group.id !== id));
  }, []);

  const removeTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id));
  }, []);

  const totalRecipients = useMemo(
    () => users.length + groups.length + teams.length,
    [groups, teams, users]
  );

  const computedMode = useMemo<"group" | "individual">(() => {
    if (groups.length > 0 || teams.length > 0) return "group";
    return users.length === 1 ? "individual" : "group";
  }, [groups, teams, users]);

  const resetForm = useCallback(() => {
    setTitle("");
    setMessage("");
    setUsers([]);
    setGroups([]);
    setTeams([]);
    setSubmitting(false);
  }, []);

  const closeModal = useCallback(() => {
    setOpen(false);
    resetForm();
  }, [resetForm]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (!next) {
        resetForm();
      }
    },
    [resetForm]
  );

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast({ title: "Informe um título" });
      return;
    }
    const plainMessage = message
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!plainMessage) {
      toast({ title: "Mensagem vazia", description: "Escreva a mensagem." });
      return;
    }
    if (users.length === 0 && groups.length === 0 && teams.length === 0) {
      toast({
        title: "Selecione destinatários",
        description:
          "Escolha usuários, grupos ou equipes para enviar a mensagem.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/chats/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message,
          mode: computedMode,
          userIds: users.map((u) => u.id),
          groupIds: groups.map((g) => g.id),
          teamIds: teams.map((t) => t.id),
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || `HTTP ${res.status}`);
      }

      toast({ title: "Mensagem enviada" });
      closeModal();

      const chatIds: string[] = Array.isArray(payload.chatIds)
        ? payload.chatIds
        : [];
      if (chatIds.length > 0) {
        router.push(`/chats/${chatIds[0]}`);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("NewMessageModal error", err);
      toast({
        title: "Erro ao enviar mensagem",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    closeModal,
    computedMode,
    groups,
    message,
    router,
    teams,
    title,
    toast,
    users,
  ]);

  const disabledReason = canCreateConversation
    ? null
    : "Apenas gestores (org_admin, org_master, unit_master ou platform_admin) podem criar conversas.";

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerTrigger asChild>
        <Button
          variant="default"
          className="gap-2"
          disabled={!canCreateConversation}
          title={disabledReason ?? undefined}>
          <MessageSquarePlus className="w-12 h-12" />
          <span className="hidden sm:block">Conversa</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-full max-h-[95vh]">
        <div className="mx-auto flex w-full h-full flex-col overflow-y-auto px-4 pb-8 sm:px-12">
          <DrawerHeader className="px-0 pb-4">
            <div className="flex items-center justify-between">
              <DrawerTitle>Enviar mensagem</DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar">
                  <X size={22} />
                </Button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="grid grid-cols-6 gap-12 h-full">
            <div className="col-span-4 space-y-6 pt-1">
              <div className="space-y-6 pb-4">
                <div className="space-y-2">
                  <Input
                    id="messages-message-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Assunto da mensagem"
                  />
                </div>
                <div className="space-y-2">
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder="Digite sua mensagem aqui..."
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
            </div>
            <div className="col-span-2 flex flex-col gap-6">
              <div className="space-y-3">
                <Tabs defaultValue="users" className="space-y-4">
                  <TabsList className="grid grid-cols-3">
                    <TabsTrigger value="users">Usuários</TabsTrigger>
                    <TabsTrigger value="groups">Grupos</TabsTrigger>
                    <TabsTrigger value="teams">Equipes</TabsTrigger>
                  </TabsList>
                  <TabsContent value="users" className="space-y-2">
                    <UserMultiSelect
                      value={users}
                      onChange={setUsers}
                      showSelectedSummary={false}
                    />
                  </TabsContent>
                  <TabsContent value="groups" className="space-y-2">
                    <GroupMultiSelect
                      value={groups}
                      onChange={setGroups}
                      showSelectedSummary={false}
                    />
                  </TabsContent>
                  <TabsContent value="teams" className="space-y-2">
                    <TeamMultiSelect
                      value={teams}
                      onChange={setTeams}
                      showSelectedSummary={false}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
          <DrawerFooter className="flex flex-col gap-2 px-0 sm:flex-row sm:justify-end">
            <div className="flex gap-2">
              <DrawerClose asChild>
                <Button
                  variant="ghost"
                  onClick={closeModal}
                  disabled={submitting}>
                  Cancelar
                </Button>
              </DrawerClose>
              <Button onClick={handleSubmit} disabled={submitting}>
                <Send />
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Enviar"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

type SelectedRecipientsProps = {
  users: UserOption[];
  groups: UserGroupOption[];
  teams: TeamOption[];
  onRemoveUser: (id: string) => void;
  onRemoveGroup: (id: string) => void;
  onRemoveTeam: (id: string) => void;
  total: number;
};

function SelectedRecipients({
  users,
  groups,
  teams,
  onRemoveUser,
  onRemoveGroup,
  onRemoveTeam,
  total,
}: SelectedRecipientsProps) {
  const hasAny = users.length || groups.length || teams.length;

  if (!hasAny) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
        Nenhum destinatário selecionado ainda. Utilize as abas ao lado para
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
          items={users.map((u) => ({
            id: u.id,
            label: u.full_name || u.id,
          }))}
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
