"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { RadioGroup } from "@/components/ui/radio-group";
import { RadioChoiceCard } from "@/components/ui/radio-choice-card";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_SPACE_FORM, type SpacePayload, type SpaceType } from "./types";

type SpaceFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValue?: SpacePayload;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: SpacePayload) => Promise<void>;
};

export function SpaceFormDialog({
  open,
  mode,
  initialValue,
  submitting,
  onOpenChange,
  onSubmit,
}: SpaceFormDialogProps) {
  const { toast } = useToast();
  const [value, setValue] = useState<SpacePayload>(DEFAULT_SPACE_FORM);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue ?? DEFAULT_SPACE_FORM);
  }, [initialValue, open]);

  async function submit() {
    if (!value.name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe um nome para o espaço.",
        variant: "destructive",
      });
      return;
    }

    await onSubmit({
      name: value.name.trim(),
      spaceType: value.spaceType,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Novo espaço" : "Editar espaço"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="space-name">Nome</Label>
            <Input
              id="space-name"
              value={value.name}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ex.: Eventos internos"
            />
          </div>

          <div>
            <RadioGroup
              value={value.spaceType}
              onValueChange={(spaceType: SpaceType) =>
                setValue((current) => ({ ...current, spaceType }))
              }
              className="flex flex-col items-center gap-4">
              <RadioChoiceCard
                value="publicacoes"
                title="Publicações"
                description="Espaço para comunicados, atualizações e conteúdos."
              />
              <RadioChoiceCard
                value="eventos"
                title="Eventos"
                description="Espaço dedicado à agenda e eventos da comunidade."
              />
            </RadioGroup>
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
                ? "Criar espaço"
                : "Salvar mudanças"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
