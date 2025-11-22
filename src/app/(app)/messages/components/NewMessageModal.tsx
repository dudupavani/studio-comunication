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
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "./RichTextEditor";
import { UserMultiSelect, type UserOption } from "./UserMultiSelect";
import { GroupMultiSelect, type UserGroupOption } from "./GroupMultiSelect";
import { cn } from "@/lib/utils";
import { Loader2, MessageSquarePlus } from "lucide-react";

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
  const [mode, setMode] = useState<"group" | "individual">("group");
  const [allowReplies, setAllowReplies] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const totalRecipients = useMemo(
    () => users.length + groups.length,
    [groups, users]
  );

  const resetForm = useCallback(() => {
    setTitle("");
    setMessage("");
    setUsers([]);
    setGroups([]);
    setMode("group");
    setAllowReplies(true);
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
    if (users.length === 0 && groups.length === 0) {
      toast({
        title: "Selecione destinatários",
        description: "Escolha usuários ou grupos para enviar a mensagem.",
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
          allowReplies,
          mode,
          userIds: users.map((u) => u.id),
          groupIds: groups.map((g) => g.id),
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
    allowReplies,
    closeModal,
    groups,
    message,
    mode,
    router,
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
      <DrawerContent className="max-h-[95vh]">
        <div className="mx-auto flex w-full flex-col overflow-y-auto px-4 pb-8 sm:px-12">
          <DrawerHeader className="px-0 pb-4">
            <DrawerTitle>Enviar mensagem</DrawerTitle>
          </DrawerHeader>

          <div className="grid grid-cols-6 gap-12">
            <div className="col-span-4 space-y-6 pb-4">
              <div className="space-y-6 pb-4">
                <div className="space-y-2">
                  <Label htmlFor="messages-message-title">Título</Label>
                  <Input
                    id="messages-message-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Assunto da mensagem"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <RichTextEditor
                    value={message}
                    onChange={setMessage}
                    placeholder="Digite sua mensagem aqui..."
                  />
                </div>
              </div>
              <div className="space-y-6">
                <h3>Modo de entrega</h3>
                <RadioGroup
                  value={mode}
                  onValueChange={(value) =>
                    setMode(value as "group" | "individual")
                  }
                  className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-4",
                      mode === "group" && "border-primary bg-primary/5"
                    )}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        Conversa em grupo
                      </span>
                      <RadioGroupItem value="group" id="mode-group" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Todos os usuários participam da mesma conversa.
                    </p>
                  </label>

                  <label
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-lg border border-border p-4",
                      mode === "individual" && "border-primary bg-primary/5"
                    )}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        Mensagem direta
                      </span>
                      <RadioGroupItem value="individual" id="mode-individual" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Um chat individual é criado para cada destinatário.
                    </p>
                  </label>
                </RadioGroup>

                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Permitir respostas</p>
                    <p className="text-xs text-muted-foreground">
                      Os destinatários poderão responder à mensagem.
                    </p>
                  </div>
                  <Switch
                    checked={allowReplies}
                    onCheckedChange={(checked) =>
                      setAllowReplies(Boolean(checked))
                    }
                  />
                </div>
              </div>
            </div>
            <div className="col-span-2 flex flex-col gap-7">
              <div>
                <h3 className="text-sm font-semibold">Usuários</h3>
                <p className="text-xs text-muted-foreground">
                  Pesquise e selecione usuários específicos.
                </p>
                <UserMultiSelect value={users} onChange={setUsers} />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Grupos de usuários</h3>
                <p className="text-xs text-muted-foreground">
                  Adicione grupos para incluir todos os membros automaticamente.
                </p>
                <GroupMultiSelect value={groups} onChange={setGroups} />
              </div>
            </div>
          </div>
          <DrawerFooter className="flex flex-col gap-2 px-0 sm:flex-row sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Selecionados: {totalRecipients} (usuários diretos + grupos)
            </div>
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
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  "Enviar mensagem"
                )}
              </Button>
            </div>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
