"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

type Props = {
  userId: string;
  userName?: string | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export default function DisableUserDialog({
  userId,
  userName,
  trigger,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/disable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || `Falha (HTTP ${res.status})`);
      }
      toast({
        title: "Usuário desativado",
        description: `O acesso de ${userName ?? "usuário"} foi desativado.`,
      });
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao desativar",
        description: err?.message ?? "Tente novamente.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="destructive" size="sm">
            Desativar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            Desativar usuário
          </DialogTitle>
          <DialogDescription>
            Isso vai desativar o usuário, mantendo todo o histórico. Você poderá
            reativar depois. Confirmar desativação de{" "}
            <strong>{userName ?? "este usuário"}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-1">
          <Button variant="warning" onClick={onConfirm} disabled={loading}>
            {loading ? "Desativando..." : "Desativar"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={loading}>
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
