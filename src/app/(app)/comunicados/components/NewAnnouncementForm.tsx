"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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
import { Loader2, Send, CalendarClock, Sparkles } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { ButtonGroup } from "@/components/ui/button-group";
import { SelectedRecipients } from "./SelectedRecipients";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  ANNOUNCEMENT_TONES,
  type AnnouncementTone,
} from "@/lib/ai/announcement-tones";

export function NewAnnouncementForm() {
  const { toast } = useToast();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [allowComments, setAllowComments] = useState(true);
  const [allowReactions, setAllowReactions] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [groups, setGroups] = useState<UserGroupOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<string>("");
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiBriefing, setAiBriefing] = useState("");
  const [aiTone, setAiTone] = useState<AnnouncementTone>(
    "formal_institucional"
  );
  const [aiLoading, setAiLoading] = useState(false);

  const isScheduling = Boolean(scheduleDate || scheduleTime);

  const handleScheduleDateChange = useCallback((value: string | null) => {
    setScheduleDate(value ?? "");
  }, []);

  const handleScheduleTimeChange = useCallback((value: string) => {
    setScheduleTime(value);
  }, []);

  const handleClearSchedule = useCallback(() => {
    setScheduleDate("");
    setScheduleTime("");
  }, []);

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
    if (scheduleDate || scheduleTime) {
      if (!scheduleDate) {
        toast({
          title: "Selecione a data do agendamento",
          description: "Defina a data antes de salvar o horário.",
        });
        return;
      }
      const isoCandidate = `${scheduleDate}T${scheduleTime || "00:00"}`;
      const parsed = new Date(isoCandidate);
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
      const res = await fetch("/api/comunicados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          allowComments,
          allowReactions,
          ...(sendAtIso ? { sendAt: sendAtIso } : {}),
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
      router.push("/comunicados");
      router.refresh();
    } catch (err: any) {
      console.error("NewAnnouncementForm error", err);
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
    router,
    scheduleDate,
    scheduleTime,
    teams,
    title,
    toast,
    users,
  ]);

  const formatAiBodyToHtml = useCallback((body: string) => {
    const paragraphs = body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paragraphs.length === 0) return "";
    return paragraphs.map((p) => `<p>${p}</p>`).join("");
  }, []);

  const handleApplyAiResult = useCallback(
    (result: { title: string; body: string }) => {
      // Título
      if (!title.trim()) {
        setTitle(result.title);
      } else if (
        typeof window !== "undefined" &&
        window.confirm("Deseja substituir o título atual pelo gerado?")
      ) {
        setTitle(result.title);
      }

      // Conteúdo
      const plainContent = content
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .trim();

      const htmlBody = formatAiBodyToHtml(result.body);

      if (!plainContent) {
        setContent(htmlBody);
      } else if (
        typeof window !== "undefined" &&
        window.confirm("Deseja substituir o texto atual pelo gerado?")
      ) {
        setContent(htmlBody);
      }

      toast({
        title: "Comunicado gerado. Revise antes de publicar.",
      });
    },
    [content, formatAiBodyToHtml, title, toast]
  );

  const handleGenerateWithAI = useCallback(async () => {
    const briefing = aiBriefing.trim();
    if (briefing.length < 10) {
      toast({
        title: "Briefing muito curto",
        description: "Descreva o comunicado em 1–3 frases.",
      });
      return;
    }

    setAiDialogOpen(false);
    setAiLoading(true);
    try {
      const res = await fetch("/api/comunicados/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ briefing, tone: aiTone }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.title || !payload?.body) {
        throw new Error(
          payload?.error ||
            payload?.error?.message ||
            `Falha ao gerar comunicado (HTTP ${res.status})`
        );
      }

      handleApplyAiResult({
        title: payload.title as string,
        body: payload.body as string,
      });
    } catch (err: any) {
      console.error("AI generate announcement error", err);
      toast({
        title: "Erro ao gerar comunicado",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setAiLoading(false);
    }
  }, [aiBriefing, aiTone, handleApplyAiResult, toast]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-6 gap-12">
        <div className="col-span-6 lg:col-span-4 space-y-6">
          <div className="space-y-6">
            <div className="space-y-2">
              <Input
                id="announcement-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="h-12"
                placeholder="Título"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setAiDialogOpen(true)}
                  disabled={aiLoading}>
                  {aiLoading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Sparkles />
                  )}
                  Gerar com IA
                </Button>
              </div>
              <CKEditorComponent
                value={content}
                onChange={setContent}
                placeholder="Escreva o comunicado..."
                chatId="comunicados"
                minHeight="240px"
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

          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <Switch
                checked={allowComments}
                onCheckedChange={(checked) =>
                  setAllowComments(Boolean(checked))
                }
              />
              <div className="space-y-1">
                <p className="text-sm font-semibold">Permitir comentários</p>
                <p className="text-xs text-muted-foreground">
                  Habilitar comentários do comunicado
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
                  Habilitar reações com emojis
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-6 lg:col-span-2 flex flex-col gap-6">
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm text-muted-foreground">
          Selecionados: {totalRecipients} (usuários, grupos e equipes)
        </span>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Button variant="outline" onClick={() => router.push("/comunicados")}>
            Cancelar
          </Button>
          <ButtonGroup>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-none">
              {submitting ? <Loader2 className="animate-spin" /> : <Send />}
              Enviar
            </Button>
            <Popover
              modal={false}
              open={schedulePopoverOpen}
              onOpenChange={setSchedulePopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="default"
                  size="icon"
                  aria-expanded={schedulePopoverOpen}
                  className="rounded-none border-0 border-l border-border">
                  <CalendarClock className="h-4 w-4" />
                  <span className="sr-only">Agendar envio</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                side="top"
                align="end"
                className="w-[320px] space-y-3 p-4 pb-6"
                sideOffset={12}>
                <div className="flex flex-col items-start justify-between gap-1">
                  <h6>Agendar envio</h6>
                  <p className="text-xs text-muted-foreground">
                    Defina quando o comunicado será disparado e exibido no
                    calendário.
                  </p>
                </div>
                <div className="flex flex-col gap-4">
                  <div className="space-y-1">
                    <Label>Data</Label>
                    <DatePicker
                      value={scheduleDate || null}
                      onChange={handleScheduleDateChange}
                      placeholder="Selecione a data"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="announcement-send-at-time">Horário</Label>
                    <Input
                      id="announcement-send-at-time"
                      type="time"
                      value={scheduleTime}
                      onChange={(event) =>
                        handleScheduleTimeChange(event.target.value)
                      }
                    />
                  </div>
                  {isScheduling ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSchedule}>
                      Limpar
                    </Button>
                  ) : null}
                </div>
              </PopoverContent>
            </Popover>
          </ButtonGroup>
        </div>
      </div>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar comunicado com IA</DialogTitle>
            <DialogDescription>
              Escreva um briefing curto e escolha o tom desejado. Nada será
              salvo automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="ai-briefing">Briefing</Label>
              <Textarea
                id="ai-briefing"
                value={aiBriefing}
                onChange={(event) => setAiBriefing(event.target.value)}
                placeholder="Descreva o comunicado em 1–3 frases..."
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ai-tone">Tom de voz</Label>
              <Select
                value={aiTone}
                onValueChange={(value) => setAiTone(value as AnnouncementTone)}>
                <SelectTrigger id="ai-tone">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ANNOUNCEMENT_TONES).map(([key, preset]) => (
                    <SelectItem key={key} value={key}>
                      {key.replace(/_/g, " ")} — {preset.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAiDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerateWithAI}
              disabled={aiLoading}>
              {aiLoading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              Gerar comunicado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
