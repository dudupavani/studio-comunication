"use client";

import { useState, useTransition } from "react";
import { removeUnitMember, addUnitMember } from "@/lib/actions/unit-members";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { UnitRole } from "@/lib/types/roles";

const DEFAULT_UNIT_ROLE: UnitRole = "unit_user";

async function searchUsersNotInUnit(orgId: string, unitId: string, q: string) {
  const res = await fetch(
    `/api/units/${unitId}/search-users?q=${encodeURIComponent(
      q
    )}`,
    { cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

export default function MembersTabClient({
  orgId,
  unitId,
  unitSlug,
  initialMembers,
}: {
  orgId: string;
  unitId: string;
  unitSlug: string;
  initialMembers: any[];
}) {
  const { toast } = useToast();
  const [members, setMembers] = useState<any[]>(initialMembers || []);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, startTransition] = useTransition();
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);

  const handleRemove = async (userId: string) => {
    if (!confirm("Remover este membro da unidade?")) return;
    setRemovingUserId(userId);
    const result = await removeUnitMember({
      orgId: orgId,
      unitId: unitId,
      unitSlug: unitSlug,
      userId: userId,
    });
    setRemovingUserId(null);

    if (result.ok) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast({ description: "Membro removido com sucesso." });
    } else {
      toast({
        description: result.error || "Erro ao remover membro.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = () => {
    startTransition(() => {
      searchUsersNotInUnit(orgId, unitId, search).then((users) => {
        setResults(users);
      });
    });
  };

  const handleAdd = async (userId: string) => {
    setAddingUserId(userId);
    const result = await addUnitMember({
      orgId: orgId,
      unitId: unitId,
      unitSlug: unitSlug,
      userId: userId,
      role: DEFAULT_UNIT_ROLE, // depois podemos tornar selecionável
    });
    setAddingUserId(null);

    if (result.ok) {
      const found = results.find((r) => r.user_id === userId);
      setMembers((prev) => [
        ...prev,
        {
          ...(result.data ?? {}),
          name: found?.full_name ?? null,
          email: found?.email ?? null,
        },
      ]);
      setResults((prev) => prev.filter((u) => u.user_id !== userId));
      toast({ description: "Membro adicionado com sucesso." });
      setOpen(false);
      setSearch("");
    } else {
      toast({
        description: result.error || "Erro ao adicionar membro.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header livre para estilizar a página */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Membros da unidade</h2>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) {
              setResults([]);
              setSearch("");
            }
          }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar membro</DialogTitle>
            </DialogHeader>

            <div className="flex gap-2 mt-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou email"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? "Buscando..." : "Buscar"}
              </Button>
            </div>

            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isSearching
                    ? "Carregando resultados..."
                    : "Nenhum resultado."}
                </p>
              ) : (
                results.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between border rounded p-2">
                    <div>
                      <div className="font-medium">
                        {user.full_name || "Sem nome"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAdd(user.user_id)}
                      disabled={addingUserId === user.user_id}>
                      {addingUserId === user.user_id
                        ? "Adicionando..."
                        : "Adicionar"}
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de membros */}
      {members.length === 0 ? (
        <div className="w-full border border-dashed border-gray-300 rounded py-12">
          <p className="text-muted-foreground text-center">
            Nenhum membro vinculado ainda.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {members.map((member) => (
            <li key={member.user_id}>
              <Card>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-medium">
                      {member.full_name || "Sem nome"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {member.email || "Sem e-mail"} — <strong>{member.role}</strong>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => handleRemove(member.user_id)}
                    disabled={removingUserId === member.user_id}>
                    {removingUserId === member.user_id
                      ? "Removendo..."
                      : "Remover"}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
