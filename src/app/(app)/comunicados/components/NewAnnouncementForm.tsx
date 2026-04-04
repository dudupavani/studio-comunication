"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  Building2,
  CalendarClock,
  Loader2,
  Send,
  Smile,
  Sparkles,
  SunMedium,
  Target,
  type LucideIcon,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Toggle } from "@/components/ui/toggle";
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
  ANNOUNCEMENT_TONES,
  type AnnouncementTone,
} from "@/lib/ai/announcement-tones";
import { cn } from "@/lib/utils";

const TONE_OPTIONS: Array<{
  value: AnnouncementTone;
  label: string;
  icon: LucideIcon;
}> = [
  {
    value: "formal_institucional",
    label: "Formal institucional",
    icon: Building2,
  },
  {
    value: "amigavel",
    label: "Amigável",
    icon: Smile,
  },
  {
    value: "motivacional",
    label: "Motivacional",
    icon: SunMedium,
  },
  {
    value: "direto_objetivo",
    label: "Direto e objetivo",
    icon: Target,
  },
];

type AiOverwriteRequest = {
  field: "title" | "content";
  value: string;
};

type Props = {
  orgId: string;
};

export function NewAnnouncementForm({ orgId }: Props) {
  const { toast } = useToast();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
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
  const [aiOverwriteQueue, setAiOverwriteQueue] = useState<
    AiOverwriteRequest[]
  >([]);

  const isScheduling = Boolean(scheduleDate || scheduleTime);
  const currentAiOverwrite = aiOverwriteQueue[0] ?? null;

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
          mediaKind: mediaUrl.trim() ? "image" : undefined,
          mediaUrl: mediaUrl.trim() || undefined,
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
    mediaUrl,
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
      const nextOverwriteRequests: AiOverwriteRequest[] = [];

      if (!title.trim()) {
        setTitle(result.title);
      } else {
        nextOverwriteRequests.push({ field: "title", value: result.title });
      }

      const plainContent = content
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .trim();

      const htmlBody = formatAiBodyToHtml(result.body);

      if (!plainContent) {
        setContent(htmlBody);
      } else {
        nextOverwriteRequests.push({ field: "content", value: htmlBody });
      }

      if (nextOverwriteRequests.length > 0) {
        setAiOverwriteQueue((prev) => [...prev, ...nextOverwriteRequests]);
      }

      toast({
        title: "Comunicado gerado. Revise antes de publicar.",
      });
    },
    [content, formatAiBodyToHtml, title, toast]
  );

  const handleResolveAiOverwrite = useCallback(
    (accept: boolean) => {
      if (!currentAiOverwrite) return;
      if (accept) {
        if (currentAiOverwrite.field === "title") {
          setTitle(currentAiOverwrite.value);
        } else {
          setContent(currentAiOverwrite.value);
        }
      }
      setAiOverwriteQueue((prev) => prev.slice(1));
    },
    [currentAiOverwrite]
  );
  const handleOverwriteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        handleResolveAiOverwrite(false);
      }
    },
    [handleResolveAiOverwrite]
  );
  const overwriteDialogCopy = currentAiOverwrite
    ? currentAiOverwrite.field === "title"
      ? {
          title: "Substituir conteúdo atual?",
          description: "Isso irá substituir o conteúdo atual pelo novo.",
        }
      : {
          title: "Substituir conteúdo atual?",
          description:
            "Isso irá substituir o texto do comunicado pelo conteúdo gerado pela IA.",
        }
    : null;

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
          <div className="space-y-3">
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
                  variant="outline"
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
                orgId={orgId}
                minHeight="240px"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="announcement-media-url">URL da imagem (opcional)</Label>
              <Input
                id="announcement-media-url"
                type="url"
                value={mediaUrl}
                onChange={(event) => setMediaUrl(event.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <p className="text-xs text-muted-foreground">
                A imagem aparece no card do feed. Vídeo ficará para V2.
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
          <Tabs defaultValue="users" className="space-y-2">
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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-end sm:gap-4">
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

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gerar comunicado com IA</DialogTitle>
            <DialogDescription className="text-muted-foreground mb-2">
              Escreva um briefing curto e escolha o tom desejado para gerar o
              conteúdo do seu comunicado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Textarea
                id="ai-briefing"
                value={aiBriefing}
                onChange={(event) => setAiBriefing(event.target.value)}
                placeholder="Descreva o comunicado em 1–3 frases..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <h6>Tom de voz</h6>
              <div className="grid gap-2 sm:grid-cols-2">
                {TONE_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const description =
                    ANNOUNCEMENT_TONES[option.value].description;
                  return (
                    <Toggle
                      key={option.value}
                      type="button"
                      pressed={aiTone === option.value}
                      onPressedChange={(pressed) => {
                        if (!pressed) return;
                        setAiTone(option.value);
                      }}
                      aria-label={`Selecionar tom ${option.label}`}
                      className={cn(
                        "flex h-auto w-full justify-start items-start gap-3 rounded-lg border bg-card px-4 py-3 text-left",
                        "data-[state=on]:border-primary data-[state=on]:bg-primary/5"
                      )}>
                      <Icon className="mt-0.5 h-8 w-8 p-2 bg-muted text-primary rounded-md flex-shrink-0" />
                      <div className="flex flex-col text-left gap-1">
                        <span className="text-sm font-medium">
                          {option.label}
                        </span>
                        <span className="text-xs font-normal text-muted-foreground">
                          {description}
                        </span>
                      </div>
                    </Toggle>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="ghost"
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
      <AlertDialog
        open={Boolean(currentAiOverwrite)}
        onOpenChange={handleOverwriteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {overwriteDialogCopy?.title ?? "Substituir conteúdo?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {overwriteDialogCopy?.description ??
                "Isso substituirá o conteúdo atual pelo texto gerado."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(event) => {
                event.preventDefault();
                handleResolveAiOverwrite(false);
              }}>
              Manter texto atual
            </AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "default" })}
              onClick={(event) => {
                event.preventDefault();
                handleResolveAiOverwrite(true);
              }}>
              Substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
