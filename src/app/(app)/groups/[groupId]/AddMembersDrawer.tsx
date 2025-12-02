"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CirclePlus } from "lucide-react";

type AvailableUser = {
  id: string;
  name: string | null;
  cargo: string | null;
  unitName: string | null;
  teamName: string | null;
};

type Props = {
  groupId: string;
};

export default function AddMembersDrawer({ groupId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<AvailableUser[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [cargoFilter, setCargoFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [teamFilter, setTeamFilter] = useState("all");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const controller = new AbortController();
    setLoading(true);

    fetch(`/api/groups/${groupId}/available-members`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error ?? "Falha ao carregar usuários.");
        }
        return res.json();
      })
      .then((payload: { users?: AvailableUser[] }) => {
        if (!cancelled) {
          setUsers(Array.isArray(payload?.users) ? payload.users : []);
          setSelected(new Set());
        }
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        if (!cancelled) {
          toast({
            title: "Erro ao carregar usuários",
            description:
              err instanceof Error ? err.message : "Falha inesperada.",
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [groupId, open, toast]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    let list = users;

    if (cargoFilter !== "all") {
      list = list.filter((u) => (u.cargo ?? "") === cargoFilter);
    }
    if (unitFilter !== "all") {
      list = list.filter((u) =>
        unitFilter === "matriz"
          ? !u.unitName
          : (u.unitName ?? "").toLowerCase() === unitFilter.toLowerCase()
      );
    }
    if (teamFilter !== "all") {
      list = list.filter((u) =>
        teamFilter === "sem-equipe"
          ? !u.teamName
          : (u.teamName ?? "").toLowerCase() === teamFilter.toLowerCase()
      );
    }

    if (!term) return list;

    return list.filter((u) => {
      const name = u.name ?? "";
      const unit = u.unitName ?? "";
      const team = u.teamName ?? "";
      const cargo = u.cargo ?? "";
      return (
        name.toLowerCase().includes(term) ||
        unit.toLowerCase().includes(term) ||
        team.toLowerCase().includes(term) ||
        cargo.toLowerCase().includes(term)
      );
    });
  }, [users, query, cargoFilter, unitFilter, teamFilter]);

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(filteredUsers.map((u) => u.id)));
    } else {
      setSelected(new Set());
    }
  };

  const handleAddMembers = async () => {
    if (!selected.size) return;
    setSaving(true);
    try {
      const members = Array.from(selected).map((userId) => ({
        userId,
        unitId: null as string | null,
      }));

      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ members }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          payload?.error ?? "Não foi possível adicionar membros."
        );
      }

      toast({
        title: "Membros adicionados",
        description: "Os usuários selecionados foram adicionados ao grupo.",
      });

      setOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Erro ao adicionar membros",
        description: err instanceof Error ? err.message : "Falha inesperada.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const anySelected = selected.size > 0;

  const availableCargos = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.cargo) set.add(u.cargo);
    });
    return Array.from(set.values());
  }, [users]);

  const availableUnits = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.unitName) set.add(u.unitName);
    });
    return Array.from(set.values());
  }, [users]);

  const availableTeams = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.teamName) set.add(u.teamName);
    });
    return Array.from(set.values());
  }, [users]);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button>
          <CirclePlus />
          Adicionar membros
        </Button>
      </DrawerTrigger>
      <DrawerContent className="min-h-[60vh] max-h-[95vh] overflow-hidden pb-0">
        <div className="flex h-full flex-col">
          <DrawerHeader>
            <DrawerTitle>Adicionar membros ao grupo</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-1 flex-col gap-4 overflow-hidden px-4 pb-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Buscar: nome, cargo, unidade ou equipe"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex-1">
                <Select value={cargoFilter} onValueChange={setCargoFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os cargos</SelectItem>
                    {availableCargos.map((cargo) => (
                      <SelectItem key={cargo} value={cargo}>
                        {cargo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={unitFilter} onValueChange={setUnitFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as unidades</SelectItem>
                    <SelectItem value="matriz">Matriz</SelectItem>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as equipes</SelectItem>
                    <SelectItem value="sem-equipe">Sem equipe</SelectItem>
                    {availableTeams.map((team) => (
                      <SelectItem key={team} value={team}>
                        {team}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-md border bg-white">
              <div className="h-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={
                            filteredUsers.length > 0 &&
                            selected.size === filteredUsers.length
                          }
                          onCheckedChange={(checked) =>
                            handleSelectAll(checked === true)
                          }
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Equipe</TableHead>
                      <TableHead>Unidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-sm">
                          Carregando usuários...
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-6 text-center text-sm">
                          Nenhum usuário disponível para adicionar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="w-10">
                            <Checkbox
                              checked={selected.has(user.id)}
                              onCheckedChange={() => toggleUser(user.id)}
                              aria-label={`Selecionar ${
                                user.name ?? "usuário"
                              }`}
                            />
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.name ?? "Sem nome"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.cargo ?? "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.teamName ?? "Sem equipe"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {user.unitName ?? "Matriz"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAddMembers}
              disabled={!anySelected || saving}>
              {saving ? "Adicionando..." : "Adicionar"}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
