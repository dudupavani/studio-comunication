"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash } from "lucide-react";
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

type Props = {
  userId: string;
  userName?: string | null;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
};

export default function DeleteUserDialog({
  userId,
  userName,
  trigger,
  onSuccess,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || `Falha (HTTP ${res.status})`);
      }
      toast({
        title: "Usuário removido",
        description: `${userName ?? "Usuário"} foi excluído da plataforma.`,
      });
      setOpen(false);
      router.refresh();
      onSuccess?.();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
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
            Remover
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Trash className="h-5 w-5 text-red-600" />
            </div>
            Remover usuário
          </DialogTitle>
          <DialogDescription>
            Essa ação exclui permanentemente o usuário e todo o seu acesso.
            Deseja continuar com a remoção de{" "}
            <strong>{userName ?? "este usuário"}</strong>?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-1">
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}>
            {loading ? "Removendo..." : "Remover"}
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
