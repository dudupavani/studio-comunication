"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";

type Org = { id: string; name: string };
type Unit = { id: string; name: string };

export default function NewUserModal() {
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  const [units, setUnits] = useState<Unit[]>([]);
  const [unitId, setUnitId] = useState<string>("");

  // roles com valor "none" como padrão (evita erro do SelectItem)
  const [orgRole, setOrgRole] = useState<"none" | "org_admin">("none");
  const [unitRole, setUnitRole] = useState<"none" | "unit_master">("none");

  const [loadingOrgs, startLoadOrgs] = useTransition();
  const [loadingUnits, startLoadUnits] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    startLoadOrgs(async () => {
      const res = await fetch("/api/admin/orgs", { cache: "no-store" });
      if (res.ok) setOrgs(await res.json());
      else
        toast({
          description: "Falha ao carregar organizações.",
          variant: "destructive",
        });
    });
  }, [open, toast]);

  useEffect(() => {
    if (!orgId) {
      setUnits([]);
      setUnitId("");
      setUnitRole("none");
      return;
    }
    startLoadUnits(async () => {
      const res = await fetch(`/api/admin/orgs/${orgId}/units`, {
        cache: "no-store",
      });
      if (res.ok) setUnits(await res.json());
      else
        toast({
          description: "Falha ao carregar unidades.",
          variant: "destructive",
        });
    });
  }, [orgId, toast]);

  const canSubmit = useMemo(
    () => !!name.trim() && !!email.trim() && !!orgId && !submitting,
    [name, email, orgId, submitting]
  );

  const reset = () => {
    setName("");
    setEmail("");
    setOrgId("");
    setOrgs([]);
    setUnits([]);
    setUnitId("");
    setOrgRole("none");
    setUnitRole("none");
  };

  const onSubmit = async () => {
    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/users/create-and-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          org_id: orgId,
          unit_id: unitId || null,
          org_role: orgRole === "none" ? null : orgRole,
          unit_role: unitId ? (unitRole === "none" ? null : unitRole) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Erro ao criar usuário");
      }
      toast({ description: "Usuário criado e vinculado com sucesso." });
      setOpen(false);
      reset();
      router.refresh();
    } catch (e: any) {
      toast({
        description: e.message ?? "Falha ao criar usuário.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo usuário
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>
            Preencha os dados para adicionar um novo usuário à organização.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>E‑mail</Label>
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Organização</Label>
            <Select
              value={orgId}
              onValueChange={(v) => setOrgId(v)}
              disabled={loadingOrgs}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingOrgs ? "Carregando..." : "Selecione uma organização"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Unidade (opcional)</Label>
            <Select
              value={unitId}
              onValueChange={(v) => setUnitId(v)}
              disabled={!orgId || loadingUnits || units.length === 0}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !orgId
                      ? "Escolha uma organização primeiro"
                      : loadingUnits
                      ? "Carregando..."
                      : units.length === 0
                      ? "Esta organização não possui unidades"
                      : "Selecione uma unidade (opcional)"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Papel na organização</Label>
            <Select value={orgRole} onValueChange={setOrgRole}>
              <SelectTrigger>
                <SelectValue placeholder="Membro (sem privilégios)" />
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
            <Label>Papel na unidade</Label>
            <Select
              value={unitRole}
              onValueChange={setUnitRole}
              disabled={!unitId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !unitId ? "Selecione uma unidade" : "Membro da unidade"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Membro da unidade</SelectItem>
                <SelectItem value="unit_master">
                  Responsável (unit_master)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onSubmit} disabled={!canSubmit}>
              {submitting ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
