// src/components/admin/new-user-modal.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Plus, CircleCheckBig } from "lucide-react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type SimpleOrg = { id: string; name: string };

// ⚠️ org_role aceita apenas "org_admin" (ou nada) e unit_role apenas "unit_master" (ou nada)
const FormSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  org_id: z.string().uuid(),
  org_role: z.enum(["org_admin"]).nullish(),
  unit_id: z.string().uuid().nullish(),
  unit_role: z.enum(["unit_master"]).nullish(),
  mode: z.enum(["invite", "create"]).default("invite"),
});

type FormData = z.infer<typeof FormSchema>;

export default function NewUserModal({
  orgId,
  defaultMode = "invite",
  // 👇 novos props Opcionais: só use quando quiser exibir o Select
  orgs,
  canChooseOrg = false,
}: {
  orgId: string;
  defaultMode?: "invite" | "create";
  orgs?: SimpleOrg[];
  canChooseOrg?: boolean;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Mantém os campos conforme sua UI. Roles começam "sem privilégios".
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    org_id: orgId,
    org_role: undefined,
    unit_id: undefined,
    unit_role: undefined,
    mode: defaultMode,
  });

  // Quando abrir o modal e puder escolher org, garanta um org_id válido
  useEffect(() => {
    if (open && canChooseOrg && orgs && orgs.length > 0) {
      const exists = orgs.some((o) => o.id === form.org_id);
      if (!exists) {
        setForm((f) => ({ ...f, org_id: orgs[0].id }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, canChooseOrg, orgs]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validação final com Zod
    const parsed = FormSchema.safeParse({
      ...form,
      // Garante que "sem privilégios" não seja enviado (fica undefined)
      org_role: form.org_role ?? undefined,
      unit_role: form.unit_role ?? undefined,
    });
    if (!parsed.success) {
      toast({
        variant: "destructive",
        title: "Formulário inválido",
        description: parsed.error.issues.map((i) => i.message).join(" • "),
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/create-and-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      let payload: any = null;
      try {
        payload = await res.json();
      } catch {}

      if (!res.ok || !payload?.ok) {
        const msg =
          payload?.error ??
          `Falha ao criar usuário (HTTP ${res.status}). Verifique os logs do servidor.`;
        toast({
          variant: "destructive",
          title: "Erro ao criar usuário",
          description: typeof msg === "string" ? msg : "Erro desconhecido.",
        });
        return;
      }

      toast({
        title: "Usuário criado",
        description: "O usuário foi criado e vinculado com sucesso.",
      });

      setForm((f) => ({ ...f, name: "", email: "" }));
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
          <Plus />
          Usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Nome completo"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              placeholder="email@dominio.com"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Organização</Label>

            {canChooseOrg && orgs && orgs.length > 0 ? (
              <Select
                value={form.org_id}
                onValueChange={(v) => setForm((f) => ({ ...f, org_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a organização" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              // ✅ Comportamento original mantido (input desabilitado)
              <Input
                value={form.org_id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, org_id: e.target.value }))
                }
                placeholder="org_id (UUID)"
                disabled
              />
            )}
          </div>

          <div className="grid gap-2">
            <Label>Papel na organização</Label>
            <Select
              // "none" apenas para controle visual; ao salvar vira undefined
              value={form.org_role ?? "none"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  org_role: v === "none" ? undefined : ("org_admin" as const),
                }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="Selecione (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Membro (sem privilégios)</SelectItem>
                <SelectItem value="org_admin">
                  Administrador da organização
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Unidade (opcional)</Label>
            {/* sua UI original aqui (select/campo que você já tem) */}
            <Input placeholder="Escolha uma organização primeiro" disabled />
          </div>

          <div className="grid gap-2">
            <Label>Papel na unidade</Label>
            <Select
              value={form.unit_role ?? "none"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  unit_role:
                    v === "none" ? undefined : ("unit_master" as const),
                }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="Membro da unidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Membro da unidade</SelectItem>
                <SelectItem value="unit_master">
                  Responsável (unit_master)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Modo de criação</Label>
            <Select
              value={form.mode}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, mode: v as "invite" | "create" }))
              }>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="invite">Convidar por e-mail</SelectItem>
                <SelectItem value="create">
                  Criar usuário (confirmado)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              <CircleCheckBig />
              {submitting ? "Criando..." : "Criar"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
