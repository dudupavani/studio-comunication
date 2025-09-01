// src/components/units/members/add-unit-member-modal.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
  DrawerDescription,
} from "@/components/ui/drawer";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Spinner } from "@/components/ui/spinner";
import EmailCopy from "@/components/EmailCopy";

type UserItem = {
  id: string;
  name: string | null;
  email: string | null; // vem de auth.users pelo backend
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

  // Busca de usuários por query
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
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button>+ Adicionar</Button>
      </DrawerTrigger>

      <DrawerContent className="max-h-[85vh] px-6">
        <DrawerHeader className="p-0">
          <DrawerTitle className="text-xl">
            Adicionar membros à unidade
          </DrawerTitle>
          <DrawerDescription>
            Selecione um ou mais usuários para vincular com esta unidade.
          </DrawerDescription>
        </DrawerHeader>

        <div className="py-6">
          <div className="pb-2">
            <Input
              placeholder="Buscar usuários..."
              onChange={(e) => searchUsers(e.target.value)}
              className="mb-2 max-w-md"
            />
          </div>

          <div className="space-y-2 max-h-[90vh] overflow-y-auto pr-1">
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
              <Table className="border border-gray-200 rounded-lg">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>E-mail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="flex items-center gap-3">
                        <Checkbox
                          aria-label={`Selecionar ${
                            u.name ?? u.email ?? "usuário"
                          }`}
                          checked={selected.includes(u.id)}
                          onCheckedChange={() => toggle(u.id)}
                        />
                        <span className="font-medium">
                          {u.name || "Sem nome"}
                        </span>
                      </TableCell>

                      <TableCell>
                        {u.email ? (
                          <div className="flex items-center gap-1">
                            <span className="text-sm truncate">{u.email}</span>
                            <EmailCopy email={u.email} />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <DrawerFooter className="p-0 pb-8">
          <DrawerClose asChild>
            <Button variant="ghost">Cancelar</Button>
          </DrawerClose>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Adicionando..." : "Adicionar"}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
