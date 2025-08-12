"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
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
import { useAuthContext } from "@/hooks/use-auth-context";
import { createUserAsAdmin } from "@/lib/actions/user";

type Org = { id: string; name: string; slug: string };

export function NewUserModal({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const { auth, loading } = useAuthContext();

  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [orgId, setOrgId] = useState<string>("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");

  // orgRole: qual papel o novo usuário terá na organização
  const [orgRole, setOrgRole] = useState<
    "org_admin" | "unit_master" | "unit_user"
  >("unit_user");

  // quem é platform_admin pode escolher a organização; org_admin não precisa (o backend força)
  const isPlatformAdmin = useMemo(
    () => auth?.platformRole === "platform_admin",
    [auth]
  );

  // quando abrir o modal: se for platform_admin, carregar orgs
  useEffect(() => {
    if (!open) return;

    if (isPlatformAdmin) {
      (async () => {
        try {
          const res = await fetch("/api/orgs", { credentials: "include" });
          const j = await res.json();
          if (!res.ok || !j?.ok) {
            throw new Error(j?.error || `HTTP ${res.status}`);
          }
          const list: Org[] = j.data ?? [];
          setOrgs(list);
          // se houver apenas 1 org, pré-seleciona
          if (list.length === 1) setOrgId(list[0].id);
        } catch (err: any) {
          toast({
            variant: "destructive",
            title: "Erro ao carregar organizações",
            description: err?.message ?? "Tente novamente.",
          });
        }
      })();
    }
  }, [open, isPlatformAdmin, toast]);

  function resetForm() {
    setFullName("");
    setEmail("");
    setOrgRole("unit_user");
    setOrgId("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validações mínimas no client para UX
    if (!email || !email.includes("@")) {
      toast({
        variant: "destructive",
        title: "E-mail inválido",
        description: "Informe um e-mail válido.",
      });
      return;
    }
    if (!fullName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome inválido",
        description: "Informe o nome completo do usuário.",
      });
      return;
    }
    if (isPlatformAdmin && !orgId) {
      toast({
        variant: "destructive",
        title: "Organização obrigatória",
        description: "Selecione a organização para o novo usuário.",
      });
      return;
    }

    startTransition(async () => {
      const res = await createUserAsAdmin({
        email,
        full_name: fullName,
        orgRole,
        // orgId só é usado/necessário quando quem cria é platform_admin
        orgId: isPlatformAdmin ? orgId : undefined,
      });

      if (!res.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao criar usuário",
          description: res.error || "Tente novamente mais tarde.",
        });
        return;
      }

      toast({
        title: "Usuário criado",
        description:
          res.status === "updated"
            ? "Usuário já existia no Auth; vínculo/atualização realizados."
            : "Cadastro realizado com sucesso.",
      });

      setOpen(false);
      resetForm();
    });
  }

  // enquanto o contexto carrega, só mostra o trigger
  if (loading) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{children}</DialogTrigger>
        {/* sem conteúdo enquanto carrega */}
      </Dialog>
    );
  }

  // se não tiver auth, não renderiza nada
  if (!auth) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Criar novo usuário</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Se for platform_admin, escolhe a organização */}
          {isPlatformAdmin && (
            <div className="space-y-2">
              <Label>Organização</Label>
              <Select value={orgId} onValueChange={setOrgId}>
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
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ex.: Maria Silva"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@dominio.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Função na organização</Label>
            <Select value={orgRole} onValueChange={(v) => setOrgRole(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="org_admin">org_admin</SelectItem>
                <SelectItem value="unit_master">unit_master</SelectItem>
                <SelectItem value="unit_user">unit_user</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                resetForm();
              }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Criando..." : "Criar usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
