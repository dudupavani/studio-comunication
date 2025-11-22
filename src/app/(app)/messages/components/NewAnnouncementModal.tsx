"use client";

import { useCallback, useMemo, useState } from "react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { RichTextEditor } from "./RichTextEditor";
import { UserMultiSelect, type UserOption } from "./UserMultiSelect";
import { GroupMultiSelect, type UserGroupOption } from "./GroupMultiSelect";
import { Loader2, Megaphone } from "lucide-react";

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
  const [submitting, setSubmitting] = useState(false);

  const totalRecipients = useMemo(
    () => users.length + groups.length,
    [groups.length, users.length]
  );

  const resetForm = useCallback(() => {
    setTitle("");
    setContent("");
    setUsers([]);
    setGroups([]);
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
    if (users.length === 0 && groups.length === 0) {
      toast({
        title: "Selecione destinatários",
        description: "Escolha usuários ou grupos para enviar o comunicado.",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/messages/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          allowComments,
          allowReactions,
          userIds: users.map((u) => u.id),
          groupIds: groups.map((g) => g.id),
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
            <DrawerTitle>Criar comunicado</DrawerTitle>
          </DrawerHeader>

          <div className="grid grid-cols-6 gap-12">
            <div className="col-span-4 space-y-6 pb-4">
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Permitir comentários</p>
                    <p className="text-xs text-muted-foreground">
                      Os destinatários poderão comentar (sem threads).
                    </p>
                  </div>
                  <Switch
                    checked={allowComments}
                    onCheckedChange={(checked) =>
                      setAllowComments(Boolean(checked))
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">Permitir reações</p>
                    <p className="text-xs text-muted-foreground">
                      Emojis de reação habilitados para este comunicado.
                    </p>
                  </div>
                  <Switch
                    checked={allowReactions}
                    onCheckedChange={(checked) =>
                      setAllowReactions(Boolean(checked))
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

          <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Selecionados: {totalRecipients} (usuários diretos + grupos)
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar comunicado
              </Button>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
