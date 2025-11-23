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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "./RichTextEditor";
import { UserMultiSelect, type UserOption } from "./UserMultiSelect";
import { GroupMultiSelect, type UserGroupOption } from "./GroupMultiSelect";
import { TeamMultiSelect, type TeamOption } from "./TeamMultiSelect";
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
      const res = await fetch("/api/messages/messages", {
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
        router.push(`/messages/${chatIds[0]}`);
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
          <MessageSquarePlus className="h-4 w-4" />
          Nova conversa
        </Button>
      </DrawerTrigger>
      <DrawerContent className="min-h-[95vh]">
        <div className="mx-auto flex w-full flex-col overflow-y-auto px-4 pb-8 sm:px-12">
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

          <div className="grid grid-cols-6 gap-12 h-dvh">
            <div className="col-span-4 space-y-6 pb-4 pt-2">
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
                    className="min-h-[260px]"
                    placeholder="Digite sua mensagem aqui..."
                  />
                </div>
                <div className="text-sm text-muted-foreground">
                  Selecionados: {totalRecipients} (usuários + grupos + equipes)
                </div>
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
                  <TabsContent value="users" className="space-y-2 ">
                    <UserMultiSelect value={users} onChange={setUsers} />
                  </TabsContent>
                  <TabsContent value="groups" className="space-y-2">
                    <GroupMultiSelect value={groups} onChange={setGroups} />
                  </TabsContent>
                  <TabsContent value="teams" className="space-y-2">
                    <TeamMultiSelect value={teams} onChange={setTeams} />
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
