"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CKEditorComponent } from "@/components/rich-text/CKEditorComponent";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, CalendarClock } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { AnnouncementDeleteButton } from "./AnnouncementDeleteButton";
import { SelectedRecipients } from "./SelectedRecipients";

type Props = {
  announcementId: string;
  initialTitle: string;
  initialContent: string;
  initialMediaUrl?: string | null;
  initialAllowComments: boolean;
  initialAllowReactions: boolean;
  initialSendAt?: string | null;
  status?: "sent" | "scheduled" | null;
  recipients: {
    users: UserOption[];
    groups: UserGroupOption[];
    teams: TeamOption[];
  };
};

function toDatetimeLocal(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (v: number) => String(v).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function EditAnnouncementForm({
  announcementId,
  initialTitle,
  initialContent,
  initialMediaUrl,
  initialAllowComments,
  initialAllowReactions,
  initialSendAt,
  status,
  recipients,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [mediaUrl, setMediaUrl] = useState(initialMediaUrl ?? "");
  const [allowComments, setAllowComments] = useState(initialAllowComments);
  const [allowReactions, setAllowReactions] = useState(initialAllowReactions);
  const [users, setUsers] = useState<UserOption[]>(recipients.users);
  const [groups, setGroups] = useState<UserGroupOption[]>(recipients.groups);
  const [teams, setTeams] = useState<TeamOption[]>(recipients.teams);
  const initialScheduleEnabled = status === "scheduled" && !!initialSendAt;
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(
    initialScheduleEnabled
  );
  const [sendAt, setSendAt] = useState<string>(
    initialScheduleEnabled ? toDatetimeLocal(initialSendAt) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  const sendAtDate = sendAt ? sendAt.split("T")[0] ?? "" : "";
  const sendAtTime =
    sendAt && sendAt.includes("T")
      ? sendAt.split("T")[1]?.slice(0, 5) ?? ""
      : "";

  const handleScheduleDateChange = useCallback(
    (value: string | null) => {
      if (!value) {
        setSendAt("");
        return;
      }
      const timeValue = sendAtTime || "00:00";
      setSendAt(`${value}T${timeValue}`);
    },
    [sendAtTime]
  );

  const handleScheduleTimeChange = useCallback(
    (value: string) => {
      if (!sendAtDate) {
        return;
      }
      const timeValue = value || "00:00";
      setSendAt(`${sendAtDate}T${timeValue}`);
    },
    [sendAtDate]
  );

  const scheduleLocked = status === "sent";

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

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      toast({ title: "Informe um título" });
      return;
    }
    const plainContent = content
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
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

    let sendAtIso: string | null = null;
    const canSchedule = scheduleEnabled && !scheduleLocked;
    if (canSchedule) {
      if (!sendAt.trim()) {
        toast({
          title: "Informe a data/hora de envio",
          description: "Para agendar, escolha o momento do disparo.",
        });
        return;
      }
      const parsed = new Date(sendAt);
      if (Number.isNaN(parsed.getTime())) {
        toast({
          title: "Data inválida",
          description: "Use uma data e hora válidas para o agendamento.",
        });
        return;
      }
      sendAtIso = parsed.toISOString();
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/comunicados/${announcementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          allowComments,
          allowReactions,
          mediaKind: mediaUrl.trim() ? "image" : undefined,
          mediaUrl: mediaUrl.trim() || undefined,
          sendAt: sendAtIso,
          userIds: users.map((u) => u.id),
          groupIds: groups.map((g) => g.id),
          teamIds: teams.map((t) => t.id),
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || `HTTP ${res.status}`);
      }

      toast({ title: "Comunicado atualizado" });
      router.push("/comunicados");
      router.refresh();
    } catch (err: any) {
      console.error("EditAnnouncementForm error", err);
      toast({
        title: "Erro ao salvar comunicado",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }, [
    allowComments,
    allowReactions,
    announcementId,
    content,
    groups,
    mediaUrl,
    router,
    scheduleEnabled,
    scheduleLocked,
    sendAt,
    teams,
    title,
    toast,
    users,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h3>Editar comunicado</h3>
          <p className="text-sm text-muted-foreground">
            Atualize o conteúdo, os destinatários e o agendamento.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-6">
        <div className="space-y-6 lg:col-span-4">
          <div className="space-y-6 rounded-lg border border-border p-4">
            <div className="space-y-2">
              <Input
                id="announcement-title"
                value={title}
                className="h-12"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título"
              />
            </div>
            <div className="space-y-2">
              <CKEditorComponent
                value={content}
                onChange={setContent}
                placeholder="Escreva o comunicado..."
                chatId={`comunicados-${announcementId}`}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="announcement-media-url-edit">
                URL da imagem (opcional)
              </Label>
              <Input
                id="announcement-media-url-edit"
                type="url"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Define a imagem exibida no card do feed.
              </p>
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

            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex flex-1 items-center gap-4 rounded-lg border border-border p-4">
                <Switch
                  checked={allowComments}
                  onCheckedChange={(checked) =>
                    setAllowComments(Boolean(checked))
                  }
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold">Permitir comentários</p>
                  <p className="text-xs text-muted-foreground">
                    Os destinatários poderão comentar (sem threads).
                  </p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-4 rounded-lg border border-border p-4">
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

            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h6>Agendar envio</h6>
                  <p className="text-xs text-muted-foreground">
                    Defina quando o comunicado será disparado e exibido no
                    calendário.
                  </p>
                </div>
                <Switch
                  checked={scheduleEnabled && !scheduleLocked}
                  onCheckedChange={(checked) =>
                    setScheduleEnabled(Boolean(checked))
                  }
                  disabled={scheduleLocked}
                />
              </div>
              {scheduleLocked ? (
                <p className="text-xs text-muted-foreground">
                  Como o comunicado já foi enviado, o horário não pode ser
                  reagendado. Você ainda pode editar título, conteúdo e
                  destinatários.
                </p>
              ) : null}
              {scheduleEnabled && !scheduleLocked ? (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>Data</Label>
                      <DatePicker
                        value={sendAt || null}
                        onChange={handleScheduleDateChange}
                        placeholder="Selecione a data"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="announcement-send-at-time-edit">
                        Horário
                      </Label>
                      <Input
                        id="announcement-send-at-time-edit"
                        type="time"
                        value={sendAtTime}
                        onChange={(event) =>
                          handleScheduleTimeChange(event.target.value)
                        }
                        disabled={!sendAtDate}
                      />
                      {!sendAtDate ? (
                        <p className="text-xs text-muted-foreground">
                          Escolha a data antes de definir o horário.
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O comunicado será enviado no horário definido e um marcador
                    aparecerá no calendário.
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="col-span-6 lg:col-span-2 flex flex-col gap-4">
          <Tabs defaultValue="users" className="flex h-full flex-col gap-4">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="groups">Grupos</TabsTrigger>
              <TabsTrigger value="teams">Equipes</TabsTrigger>
            </TabsList>
            <TabsContent value="users" className="flex h-full flex-col gap-2">
              <p className="text-xs text-muted-foreground">
                Pesquise e selecione usuários específicos.
              </p>
              <UserMultiSelect
                value={users}
                onChange={setUsers}
                apiBase="/api/comunicados/recipients"
                showSelectedSummary={false}
                stretchList
              />
            </TabsContent>
            <TabsContent value="groups" className="space-y-2">
              <p className="text-xs text-center text-muted-foreground">
                Todos os membros do grupo serão adicionados
              </p>
              <GroupMultiSelect
                value={groups}
                onChange={setGroups}
                apiBase="/api/comunicados/recipients"
                showSelectedSummary={false}
              />
            </TabsContent>
            <TabsContent value="teams" className="space-y-2">
              <p className="text-xs text-center text-muted-foreground">
                Todos os membros das equipes serão adicionados
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
      <div className="flex justify-between items-center gap-2">
        <AnnouncementDeleteButton
          announcementId={announcementId}
          redirectTo="/comunicados"
          variant="outline"
        />
        <Button onClick={handleSubmit} disabled={submitting} type="button">
          {submitting ? (
            <Loader2 className="ml-2 h-4 w-4 animate-spin" />
          ) : null}
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
