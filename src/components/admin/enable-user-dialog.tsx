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
import { UserCheck } from "lucide-react";

type Props = {
  userId: string;
  userName?: string | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export default function EnableUserDialog({
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
      const res = await fetch(`/api/users/${userId}/enable`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || `Falha (HTTP ${res.status})`);
      }
      toast({
        title: "Usuário ativado",
        description: `O acesso de ${userName ?? "usuário"} foi reativado.`,
      });
      setOpen(false);
      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao ativar",
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
          <Button size="sm">
            <UserCheck className="h-4 w-4 mr-2" />
            Ativar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <UserCheck className="h-5 w-5 text-green-600" />
            </div>
            Ativar usuário
          </DialogTitle>
          <DialogDescription>
            Isso irá restaurar o acesso de{" "}
            <strong>{userName ?? "este usuário"}</strong>. Confirmar ativação?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-1">
          <Button onClick={onConfirm} disabled={loading} variant={"success"}>
            {loading ? "Ativando..." : "Ativar"}
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
