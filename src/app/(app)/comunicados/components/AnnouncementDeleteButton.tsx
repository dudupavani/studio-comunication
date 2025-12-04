"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";

type Props = {
  announcementId: string;
  redirectTo?: string;
  onDeleted?: () => void;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  trigger?: React.ReactNode | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AnnouncementDeleteButton({
  announcementId,
  redirectTo,
  onDeleted,
  variant = "destructive",
  size = "sm",
  trigger,
  open,
  onOpenChange,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const isControlled = typeof open === "boolean" && typeof onOpenChange === "function";
  const dialogOpen = isControlled ? (open as boolean) : internalOpen;
  const setDialogOpen = isControlled ? (onOpenChange as (open: boolean) => void) : setInternalOpen;

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/comunicados/${announcementId}`, {
        method: "DELETE",
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error?.message || `HTTP ${res.status}`);
      }
      toast({ title: "Comunicado removido" });
      if (onDeleted) onDeleted();
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("Delete announcement error", err);
      toast({
        title: "Erro ao excluir",
        description: err?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setDialogOpen(false);
    }
  };

  const triggerNode =
    trigger === undefined ? (
      <Button variant={variant} size={size} type="button">
        <Trash2 className="h-4 w-4" />
        Excluir
      </Button>
    ) : (
      trigger
    );

  return (
    <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {triggerNode !== null ? (
        <AlertDialogTrigger asChild>{triggerNode}</AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir comunicado</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação é permanente e remove o comunicado, os comentários e o
            marcador do calendário.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {loading ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
