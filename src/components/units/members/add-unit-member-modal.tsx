// src/components/units/members/add-unit-member-modal.tsx
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// SUBSTITUI Dialog por Drawer
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

type UserItem = {
  id: string;
  name: string | null;
  email: string | null;
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
              className="mb-2"
            />
          </div>

          <div className="space-y-2 max-h-[90vh] overflow-y-auto pr-1">
            {loadingList && (
              <p className="text-sm text-muted-foreground">
                Carregando usuários…
              </p>
            )}
            {!loadingList && users.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum usuário disponível para vincular.
              </p>
            )}
            {users.map((u) => (
              <label
                key={u.id}
                className="flex items-center gap-3 rounded-md border p-2">
                <Checkbox
                  checked={selected.includes(u.id)}
                  onCheckedChange={() => toggle(u.id)}
                />
                <div className="text-left">
                  <p className="font-medium leading-none">
                    {u.name || "Sem nome"}
                  </p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
              </label>
            ))}
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
