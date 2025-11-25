// src/components/units/members/add-unit-member-modal.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Spinner } from "@/components/ui/spinner";
import UserLineItem from "@/components/users/user-line-item";

type UserItem = {
  id: string;
  name: string | null;
  email: string | null;
  avatarUrl?: string | null;
};

export default function AddUnitMemberModal({
  orgId,
  unitId,
}: {
  orgId: string;
  unitId: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    fetch(`/api/units/${unitId}/available-members?org_id=${orgId}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok || !data.ok) {
          throw new Error(data?.error || `HTTP ${r.status}`);
        }
        setUsers(data.users as UserItem[]);
      })
      .catch((err: any) => {
        toast({
          variant: "destructive",
          title: "Erro ao carregar usuários",
          description: err?.message ?? "Tente novamente.",
        });
      })
      .finally(() => setLoadingList(false));
  }, [open, unitId, orgId, toast]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // Busca de usuários por query (mantida)
  async function searchUsers(q: string) {
    if (!q.trim()) {
      setLoadingList(true);
      try {
        const res = await fetch(
          `/api/units/${unitId}/available-members?org_id=${orgId}`
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          throw new Error(data?.error || `HTTP ${res.status}`);
        }
        setUsers(data.users as UserItem[]);
      } catch (err: any) {
        toast({
          variant: "destructive",
          title: "Erro ao carregar usuários",
          description: err?.message ?? "Tente novamente.",
        });
      } finally {
        setLoadingList(false);
      }
      return;
    }

    setLoadingList(true);
    try {
      const res = await fetch(
        `/api/units/${unitId}/search-users?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      setUsers(data.users as UserItem[]);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar usuários",
        description: err?.message ?? "Tente novamente.",
      });
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSave() {
    if (selected.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecione pelo menos um usuário",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/units/${unitId}/add-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, user_ids: selected }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
      toast({
        title: "Membros adicionados",
        description: "Vínculo realizado com sucesso.",
      });
      setOpen(false);
      setSelected([]);
      router.refresh();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao vincular",
        description: err?.message ?? "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus size={22} />
          Adicionar
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-xl px-6">
        <div className="flex h-full flex-col gap-4 py-4">
          <SheetHeader className="text-left mb-1">
            <SheetTitle className="text-xl">
              Adicionar membros à unidade
            </SheetTitle>
            <SheetDescription>
              Selecione um ou mais usuários para vincular com esta unidade
            </SheetDescription>
          </SheetHeader>

          <div className="pb-0">
            <Input
              placeholder="Buscar"
              onChange={(e) => searchUsers(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            {loadingList && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                <Spinner className="h-12 w-12" />
                <span className="text-sm">Carregando usuários...</span>
              </div>
            )}

            {!loadingList && users.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário disponível para vincular.
              </p>
            )}

            {!loadingList && users.length > 0 && (
              <Table className="border border-gray-200 rounded-lg opacity-0 translate-y-4 animate-fade-in-up">
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuários</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="py-2">
                        <UserLineItem
                          id={u.id}
                          name={u.name}
                          email={u.email}
                          avatarUrl={u.avatarUrl ?? null}
                          size="md"
                          orientation="stacked"
                          withCopy
                          checkbox={{
                            checked: selected.includes(u.id),
                            onCheckedChange: () => toggle(u.id),
                            ariaLabel: `Selecionar ${
                              u.name ?? u.email ?? "usuário"
                            }`,
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <SheetFooter className="pt-4">
            <SheetClose asChild>
              <Button variant="ghost">Cancelar</Button>
            </SheetClose>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Adicionando..." : "Adicionar"}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
