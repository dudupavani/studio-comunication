"use client";

import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { parseJson } from "./publication-composer-utils";
import {
  DEFAULT_COMMUNITY_FORM,
  type CommunityPayload,
  type SegmentOption,
  type SegmentType,
  type CommunityVisibility,
} from "./types";

type CommunityFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: CommunityPayload;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: CommunityPayload) => Promise<void>;
};

export function CommunityFormDialog({
  open,
  mode,
  initialValue,
  submitting,
  onOpenChange,
  onSubmit,
}: CommunityFormDialogProps) {
  const { toast } = useToast();
  const [value, setValue] = useState<CommunityPayload>(DEFAULT_COMMUNITY_FORM);
  const [segmentOptions, setSegmentOptions] = useState<SegmentOption[]>([]);
  const [segmentLoading, setSegmentLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue({
      ...(initialValue ?? DEFAULT_COMMUNITY_FORM),
      allowUnitUserPost: false,
    });
  }, [initialValue, open]);

  const loadSegmentOptions = useCallback(
    async (segmentType: SegmentType) => {
      try {
        setSegmentLoading(true);
        const endpoint =
          segmentType === "group"
            ? "/api/comunicados/recipients/groups?limit=100"
            : "/api/comunicados/recipients/teams?limit=100";

        const payload = await parseJson<{ items: any[] }>(
          await fetch(endpoint, { cache: "no-store" }),
        );

        setSegmentOptions(
          payload.items.map((item) => ({
            id: item.id as string,
            name: item.name as string,
            membersCount: item.membersCount as number | undefined,
          })),
        );
      } catch (error) {
        setSegmentOptions([]);
        toast({
          title: "Erro ao carregar segmentação",
          description:
            error instanceof Error
              ? error.message
              : "Não foi possível carregar as opções de segmentação.",
          variant: "destructive",
        });
      } finally {
        setSegmentLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (!open) return;
    if (value.visibility !== "segmented") {
      setSegmentOptions([]);
      return;
    }

    if (!value.segmentType) {
      setSegmentOptions([]);
      return;
    }

    loadSegmentOptions(value.segmentType);
  }, [loadSegmentOptions, open, value.segmentType, value.visibility]);

  function toggleSegmentTarget(targetId: string) {
    setValue((current) => {
      const nextTargets = current.segmentTargetIds.includes(targetId)
        ? current.segmentTargetIds.filter((id) => id !== targetId)
        : [...current.segmentTargetIds, targetId];

      return {
        ...current,
        segmentTargetIds: nextTargets,
      };
    });
  }

  async function submit() {
    if (!value.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para a comunidade.",
        variant: "destructive",
      });
      return;
    }

    if (value.visibility === "segmented") {
      if (!value.segmentType) {
        toast({
          title: "Segmentação incompleta",
          description: "Selecione tipo de segmentação para continuar.",
          variant: "destructive",
        });
        return;
      }

      if (!value.segmentTargetIds.length) {
        toast({
          title: "Segmentação incompleta",
          description: "Selecione ao menos um alvo de segmentação.",
          variant: "destructive",
        });
        return;
      }
    }

    await onSubmit({
      ...value,
      name: value.name.trim(),
      allowUnitUserPost: false,
      segmentType: value.visibility === "segmented" ? value.segmentType : null,
      segmentTargetIds:
        value.visibility === "segmented" ? value.segmentTargetIds : [],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Nova comunidade" : "Editar comunidade"}
          </DialogTitle>
          <DialogDescription>
            Configure visibilidade, segmentação e permissões de postagem da
            comunidade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="community-name">Nome</Label>
            <Input
              id="community-name"
              value={value.name}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ex.: Comunicados da matriz"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="community-visibility">Visibilidade</Label>
            <Select
              value={value.visibility}
              onValueChange={(visibility: CommunityVisibility) => {
                setValue((current) => ({
                  ...current,
                  visibility,
                  segmentType:
                    visibility === "segmented" ? current.segmentType : null,
                  segmentTargetIds:
                    visibility === "segmented" ? current.segmentTargetIds : [],
                }));
              }}>
              <SelectTrigger id="community-visibility">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global</SelectItem>
                <SelectItem value="segmented">Segmentada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.visibility === "segmented" ? (
            <div className="space-y-4 rounded-md border p-3">
              <div className="space-y-2">
                <Label htmlFor="community-segment-type">Segmentar por</Label>
                <Select
                  value={value.segmentType ?? undefined}
                  onValueChange={(segmentType: SegmentType) => {
                    setValue((current) => ({
                      ...current,
                      segmentType,
                      segmentTargetIds: [],
                    }));
                  }}>
                  <SelectTrigger id="community-segment-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group">Grupo</SelectItem>
                    <SelectItem value="team">Equipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {value.segmentType ? (
                <div className="space-y-2">
                  <Label>Alvos da segmentação</Label>
                  {segmentLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : (
                    <ScrollArea className="h-40 rounded-md border p-2">
                      <div className="space-y-2">
                        {segmentOptions.map((option) => (
                          <label
                            key={option.id}
                            className="flex items-center justify-between gap-2 rounded-md border px-2 py-2">
                            <span className="flex items-center gap-2">
                              <Checkbox
                                checked={value.segmentTargetIds.includes(
                                  option.id,
                                )}
                                onCheckedChange={() =>
                                  toggleSegmentTarget(option.id)
                                }
                              />
                              <span className="text-sm">{option.name}</span>
                            </span>
                            {typeof option.membersCount === "number" ? (
                              <Badge variant="outline">
                                {option.membersCount}
                              </Badge>
                            ) : null}
                          </label>
                        ))}

                        {!segmentOptions.length ? (
                          <p className="px-1 text-sm text-muted-foreground">
                            Nenhum alvo disponível para este tipo de
                            segmentação.
                          </p>
                        ) : null}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <label className="flex items-center justify-between gap-3">
              <span className="space-y-1">
                <span className="block text-sm font-medium">
                  Permitir postagem de unit_master
                </span>
                <span className="block text-sm text-muted-foreground">
                  Quando ativo, usuários unit_master podem publicar nesta
                  comunidade.
                </span>
              </span>
              <Switch
                checked={value.allowUnitMasterPost}
                onCheckedChange={(checked) =>
                  setValue((current) => ({
                    ...current,
                    allowUnitMasterPost: checked,
                  }))
                }
              />
            </label>

          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting
              ? mode === "create"
                ? "Criando..."
                : "Salvando..."
              : mode === "create"
                ? "Criar comunidade"
                : "Salvar mudanças"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
