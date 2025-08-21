// src/components/users/new-user-modal.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Send } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function NewUserModal() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users/invite-magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.ok) {
        const msg =
          payload?.error ??
          `Falha ao enviar convite (HTTP ${res.status}). Verifique os logs do servidor.`;
        toast({
          variant: "destructive",
          title: "Erro ao convidar usuário",
          description: String(msg),
        });
        return;
      }
      toast({
        title: "Convite enviado",
        description: `Enviamos um Magic Link para ${email}. Peça ao usuário para verificar a caixa de entrada/spam.`,
      });
      setEmail("");
      setOpen(false);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro de rede",
        description: err?.message ?? "Não foi possível contatar o servidor.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@dominio.com"
            required
            autoComplete="email"
          />
          <Button type="submit" disabled={submitting}>
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Enviando..." : "Enviar convite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
