"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";

type UserItem = {
  id: string;
  name: string | null;
  email: string | null;
};

export default function AddUnitMemberModal({
  orgId,
  unitId,
  onAdded,
}: {
  orgId: string;
  unitId: string;
  onAdded?: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetch(`/api/orgs/${orgId}/available-members?unitId=${unitId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.ok) {
            setUsers(data.users);
          } else {
            toast({
              variant: "destructive",
              title: "Erro ao carregar usuários",
              description: data?.error || "Tente novamente.",
            });
          }
        })
        .catch((err) => {
          toast({
            variant: "destructive",
            title: "Erro de rede",
            description: err.message,
          });
        });
    }
  }, [open, orgId, unitId, toast]);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    if (selected.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecione pelo menos um usuário",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/units/${unitId}/add-members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, user_ids: selected }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast({
          variant: "destructive",
          title: "Erro ao vincular",
          description: data.error || "Tente novamente.",
        });
      } else {
        toast({
          title: "Membros adicionados",
          description: "Os usuários foram vinculados à unidade.",
        });
        setOpen(false);
        setSelected([]);
        onAdded?.();
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro de rede",
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default">+ Adicionar</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar membros à unidade</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {users.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum usuário disponível para vincular.
            </p>
          )}
          {users.map((u) => (
            <label
              key={u.id}
              className="flex items-center space-x-2 rounded-md border p-2 cursor-pointer">
              <Checkbox
                checked={selected.includes(u.id)}
                onCheckedChange={() => toggleSelect(u.id)}
              />
              <div>
                <p className="font-medium">{u.name || "Sem nome"}</p>
                <p className="text-sm text-muted-foreground">{u.email}</p>
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
