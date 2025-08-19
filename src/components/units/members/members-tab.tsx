"use client";

import { useEffect, useState, useTransition } from "react";
import {
  listUnitMembers,
  removeUnitMember,
  addUnitMember,
} from "@/lib/actions/unit-members";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { UnitRole } from "@/lib/types/roles";

const DEFAULT_UNIT_ROLE: UnitRole = "unit_user";

// Fetch para a rota de busca
async function searchUsersNotInUnit(orgId: string, unitId: string, q: string) {
  const res = await fetch(
    `/api/units/${unitId}/search-users?q=${encodeURIComponent(
      q
    )}`,
    { cache: "no-store" }
  );
  return res.json();
}

interface MembersTabProps {
  orgId: string;
  unitId: string;
  unitSlug: string;
}

export default function MembersTab({
  orgId,
  unitId,
  unitSlug,
}: MembersTabProps) {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, startTransition] = useTransition();

  useEffect(() => {
    async function loadMembers() {
      const data = await listUnitMembers(unitId);
      setMembers(data);
      setLoading(false);
    }
    loadMembers();
  }, [unitId]);

  const handleRemove = async (userId: string) => {
    const confirm = window.confirm("Remover este membro da unidade?");
    if (!confirm) return;

    const result = await removeUnitMember({
      orgId: orgId,
      unitId: unitId,
      unitSlug: unitSlug,
      userId: userId,
    });

    if (result.ok) {
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      toast.success("Membro removido.");
    } else {
      toast.error(result.error || "Erro ao remover membro.");
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
    const result = await addUnitMember({
      orgId: orgId,
      unitId: unitId,
      unitSlug: unitSlug,
      userId: userId,
      role: DEFAULT_UNIT_ROLE, // Pode tornar isso selecionável depois
    });

    if (result.ok) {
      setMembers((prev) => [...prev, result.data]);
      toast.success("Membro adicionado.");
      setResults((prev) => prev.filter((u) => u.user_id !== userId));
    } else {
      toast.error(result.error || "Erro ao adicionar membro.");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Membros da unidade</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Adicionar membro</Button>
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
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                Buscar
              </Button>
            </div>
            <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum resultado.
                </p>
              ) : (
                results.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between border p-2 rounded">
                    <div>
                      <div className="font-medium">
                        {user.full_name || "Sem nome"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAdd(user.user_id)}>
                      Adicionar
                    </Button>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Carregando membros...</p>
        ) : members.length === 0 ? (
          <p>Nenhum membro vinculado ainda.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.user_id}
                className="flex items-center justify-between border rounded p-3">
                <div>
                  <div className="font-medium">{member.full_name || "Sem nome"}</div>
                  <div className="text-sm text-muted-foreground">
                    {member.email || "Sem e-mail"} –{" "}
                    <strong>{member.role}</strong>
                  </div>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => handleRemove(member.user_id)}>
                  Remover
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
