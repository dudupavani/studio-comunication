"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle, ChevronDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { parseJson } from "./publication-composer-utils";
import type { CommunityPayload, SegmentOption } from "./types";

type CommunityCreateWizardProps = {
  submitting: boolean;
  onSubmit: (payload: CommunityPayload) => Promise<void>;
  onCancel?: () => void;
};

type Step = 1 | 2;

function StepIndicator({ current, total }: { current: Step; total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => i + 1).map((step) => (
        <div
          key={step}
          className={
            step === current
              ? "h-2 w-8 rounded-full bg-foreground"
              : "h-2 w-2 rounded-full bg-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

type MultiSelectProps = {
  options: SegmentOption[];
  selected: string[];
  placeholder: string;
  loading?: boolean;
  onChange: (ids: string[]) => void;
};

function MultiSelect({ options, selected, placeholder, loading, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);

  function toggle(id: string) {
    onChange(
      selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id],
    );
  }

  const selectedLabels = options.filter((o) => selected.includes(o.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={loading}>
          <span className="flex flex-1 flex-wrap gap-1">
            {selectedLabels.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selectedLabels.map((opt) => (
                <Badge
                  key={opt.id}
                  variant="secondary"
                  className="gap-1 pr-1 text-xs font-normal">
                  {opt.name}
                  <span
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded-sm opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(opt.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.stopPropagation();
                        toggle(opt.id);
                      }
                    }}>
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {loading ? (
          <div className="space-y-2 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : options.length === 0 ? (
          <p className="p-3 text-sm text-muted-foreground">
            Nenhuma opção disponível.
          </p>
        ) : (
          <ScrollArea className="max-h-56">
            <div className="p-1">
              {options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                  onClick={() => toggle(opt.id)}>
                  <span>{opt.name}</span>
                  {selected.includes(opt.id) && (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function CommunityCreateWizard({
  submitting,
  onSubmit,
  onCancel,
}: CommunityCreateWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [groups, setGroups] = useState<SegmentOption[]>([]);
  const [teams, setTeams] = useState<SegmentOption[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const loadSegments = useCallback(async () => {
    try {
      setGroupsLoading(true);
      setTeamsLoading(true);

      const [groupsRes, teamsRes] = await Promise.all([
        fetch("/api/comunicados/recipients/groups?limit=100", { cache: "no-store" }),
        fetch("/api/comunicados/recipients/teams?limit=100", { cache: "no-store" }),
      ]);

      const [groupsPayload, teamsPayload] = await Promise.all([
        parseJson<{ items: any[] }>(groupsRes),
        parseJson<{ items: any[] }>(teamsRes),
      ]);

      setGroups(
        groupsPayload.items.map((item) => ({
          id: item.id as string,
          name: item.name as string,
          membersCount: item.membersCount as number | undefined,
        })),
      );
      setTeams(
        teamsPayload.items.map((item) => ({
          id: item.id as string,
          name: item.name as string,
          membersCount: item.membersCount as number | undefined,
        })),
      );
    } catch {
      toast({
        title: "Erro ao carregar segmentação",
        description: "Não foi possível carregar grupos e equipes.",
        variant: "destructive",
      });
    } finally {
      setGroupsLoading(false);
      setTeamsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadSegments();
  }, [loadSegments]);

  function handleAdvance() {
    if (!name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para a comunidade.",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  }

  async function handleCreate() {
    const hasGroups = selectedGroupIds.length > 0;
    const hasTeams = selectedTeamIds.length > 0;

    const payload: CommunityPayload = {
      name: name.trim(),
      allowUnitMasterPost: true,
      allowUnitUserPost: false,
      visibility: hasGroups || hasTeams ? "segmented" : "global",
      segmentType: hasGroups ? "group" : hasTeams ? "team" : null,
      segmentTargetIds: hasGroups ? selectedGroupIds : hasTeams ? selectedTeamIds : [],
    };

    await onSubmit(payload);
  }

  return (
    <div className="flex min-h-[100dvh] flex-1 items-stretch bg-background">
      {/* Left: form */}
      <div className="flex flex-1 flex-col justify-center px-10 py-12 lg:max-w-[560px]">
        <div className="mx-auto w-full max-w-md space-y-8">
          <StepIndicator current={step} total={2} />

          <div className="space-y-1.5">
            <h1>Agora vamos criar sua comunidade</h1>
            <p className="text-sm text-muted-foreground">
              Não se preocupe — você pode alterar essas informações depois
            </p>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="wizard-community-name">
                  Dê um nome para a sua comunidade
                </Label>
                <Input
                  id="wizard-community-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAdvance();
                  }}
                  autoFocus
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAdvance} disabled={!name.trim()}>
                  Avançar
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <p className="font-semibold">Segmentação da audiência</p>

                <div className="space-y-2">
                  <Label>Grupo de usuário</Label>
                  <MultiSelect
                    options={groups}
                    selected={selectedGroupIds}
                    placeholder="Selecione o(os) grupo(os)"
                    loading={groupsLoading}
                    onChange={setSelectedGroupIds}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Equipes</Label>
                  <MultiSelect
                    options={teams}
                    selected={selectedTeamIds}
                    placeholder="Selecione a(as) equipe(es)"
                    loading={teamsLoading}
                    onChange={setSelectedTeamIds}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                {onCancel ? (
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    disabled={submitting}>
                    Voltar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setStep(1)}
                    disabled={submitting}>
                    Voltar
                  </Button>
                )}

                <Button onClick={handleCreate} disabled={submitting}>
                  <CheckCircle className="h-4 w-4" />
                  {submitting ? "Criando..." : "Criar comunidade"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: preview area */}
      <div className="hidden flex-1 items-center justify-center bg-muted/30 p-10 lg:flex">
        <div className="h-full w-full max-w-sm rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
