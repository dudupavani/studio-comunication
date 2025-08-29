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

// ⬇️ shadcn Select (se não tiver instalado, me avise que mando versão com <select> nativo)
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

type Role = "unit_user" | "unit_master" | "org_admin" | "org_master";

export default function NewUserModal() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("unit_user"); // default seguro
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users/invite-magic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          role, // ⬅️ agora enviamos a função escolhida
        }),
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
        description: `Verifique o ${email} e confirme a sua conta`,
      });
      setEmail("");
      setRole("unit_user");
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
          <div className="grid gap-2">
            <label htmlFor="email" className="text-sm font-medium">
              E-mail do usuário
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@dominio.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="grid gap-2">
            <span className="text-sm font-medium">Função (role)</span>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unit_user">Unid. User</SelectItem>
                <SelectItem value="unit_master">Unid. Master</SelectItem>
                <SelectItem value="org_admin">Org Admin</SelectItem>
                <SelectItem value="org_master">Org Master</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Padrão seguro: <code>unit_user</code>.
            </p>
          </div>

          <Button type="submit" disabled={submitting || !email}>
            <Send className="mr-2 h-4 w-4" />
            {submitting ? "Enviando..." : "Enviar convite"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
