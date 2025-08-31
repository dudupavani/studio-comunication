// src/components/units/members/remove-unit-member-button.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { UserMinus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Props = {
  orgId: string;
  unitId: string;
  userId: string;
  userName?: string | null;
};

export default function RemoveUnitMemberButton({
  orgId,
  unitId,
  userId,
  userName,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    try {
      setSubmitting(true);
      const res = await fetch(
        `/api/units/${unitId}/members/${userId}?org_id=${orgId}`,
        { method: "DELETE", cache: "no-store" }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "Falha ao remover membro.");
      }

      toast({
        title: "Membro removido",
        description: userName
          ? `“${userName}” foi desvinculado da unidade.`
          : undefined,
      });

      setOpen(false);
      router.refresh();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message ?? "Não foi possível remover o membro.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Remover membro"
          title="Remover membro">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserMinus className="h-4 w-4" />
          )}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover membro da unidade?</AlertDialogTitle>
          <AlertDialogDescription>
            {userName
              ? `Confirma remover “${userName}” desta unidade?`
              : "Confirma remover este usuário desta unidade?"}
            <br />
            Esta ação pode ser revertida adicionando o usuário novamente quando
            desejar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={submitting}>
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Removendo...
              </span>
            ) : (
              "Remover"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
