"use client";

import { useState, useEffect } from "react";
import { Copy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getUnitMemberCount } from "@/lib/actions/unit-members";
import type { Unit } from "@/lib/actions/units";

type Props = {
  unit: Unit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function CopyButton({ value, label }: { value: string; label: string }) {
  const { toast } = useToast();

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Copiado" });
    } catch {
      toast({ title: "Falha ao copiar", variant: "destructive" });
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      aria-label={`Copiar ${label}`}
      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground">
      <Copy className="h-3.5 w-3.5" />
    </Button>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">—</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-sm">{value}</p>
        <CopyButton value={value} label={label} />
      </div>
    </div>
  );
}

export default function UnitDetailModal({ unit, open, onOpenChange }: Props) {
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  useEffect(() => {
    if (!open || !unit) return;
    setMemberCount(null);
    setLoadingCount(true);
    getUnitMemberCount(unit.org_id, unit.id)
      .then(setMemberCount)
      .finally(() => setLoadingCount(false));
  }, [open, unit]);

  if (!unit) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{unit.name}</DialogTitle>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          <Field label="Nome" value={unit.name} />
          <Field label="Endereço" value={unit.address} />
          <Field label="CNPJ" value={unit.cnpj} />
          <Field label="Telefone" value={unit.phone} />

          <div className="space-y-1 pt-2 border-t">
            <p className="text-xs text-muted-foreground">Membros</p>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              {loadingCount ? (
                <span className="text-sm text-muted-foreground">Carregando...</span>
              ) : (
                <span className="text-sm font-medium">{memberCount ?? 0}</span>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
