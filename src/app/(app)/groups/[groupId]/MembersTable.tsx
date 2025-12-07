// src/app/(app)/groups/[groupId]/MembersTable.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import UserSummary from "@/components/shared/user-summary";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Loader2, Trash2 } from "lucide-react";
import { UserGroupList } from "@/components/shared/user-group-list";

type Row = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  cargo: string | null;
  roleLabel: string | null;
  unitName: string | null;
  addedAt: string;
  groups?: Array<{ id: string; name: string; color?: string | null }>;
};

type Props = {
  rows: Row[];
  totalCount: number;
  groupId: string;
};

export default function MembersTable({ rows, totalCount, groupId }: Props) {
  // Busca e ordenação
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "unit" | "addedAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const { toast } = useToast();

  const [localRows, setLocalRows] = useState(rows);
  const [localTotal, setLocalTotal] = useState(totalCount);

  useEffect(() => {
    setLocalRows(rows);
    setLocalTotal(totalCount);
    setPage(1);
  }, [rows, totalCount]);

  // Paginação local
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRow, setConfirmRow] = useState<Row | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? localRows.filter((r) => {
          const name = r.name ?? "";
          const email = r.email ?? "";
          const unit = r.unitName ?? "";
          return (
            name.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q) ||
            unit.toLowerCase().includes(q)
          );
        })
      : localRows;

    const sorted = [...base].sort((a, b) => {
      let A: string | number = "",
        B: string | number = "";
      if (sortBy === "name") {
        A = a.name ?? "";
        B = b.name ?? "";
      } else if (sortBy === "unit") {
        A = a.unitName ?? "";
        B = b.unitName ?? "";
      } else {
        A = new Date(a.addedAt).getTime();
        B = new Date(b.addedAt).getTime();
      }
      if (A < B) return sortDir === "asc" ? -1 : 1;
      if (A > B) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [localRows, query, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  function toggleSort(col: "name" | "unit" | "addedAt") {
    if (col === sortBy) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  async function handleRemove(userId: string) {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [userId] }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error ?? res.statusText);
      }
      setLocalRows((prev) => {
        const next = prev.filter((row) => row.id !== userId);
        const nextTotalPages = Math.max(1, Math.ceil(next.length / pageSize));
        setPage((current) => Math.min(current, nextTotalPages));
        return next;
      });
      setLocalTotal((prev) => Math.max(0, prev - 1));
      toast({
        title: "Usuário removido do grupo",
      });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description:
          err instanceof Error ? err.message : "Tente novamente em instantes.",
        variant: "destructive",
      });
    } finally {
      setRemovingId(null);
    }
    setConfirmRow(null);
  }

  return (
    <div className="space-y-3">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full sm:max-w-xs"
        />
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead
                role="button"
                onClick={() => toggleSort("name")}
                className="cursor-pointer select-none"
                title="Ordenar por nome">
                Nome {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead
                role="button"
                onClick={() => toggleSort("unit")}
                className="cursor-pointer select-none"
                title="Ordenar por unidade">
                Unidade{" "}
                {sortBy === "unit" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead
                role="button"
                onClick={() => toggleSort("addedAt")}
                className="cursor-pointer select-none"
                title="Ordenar por data de entrada">
                Adicionado em
                {sortBy === "addedAt" ? (sortDir === "asc" ? "↑" : "↓") : ""}
              </TableHead>
              <TableHead className="w-[160px]">Função</TableHead>
              <TableHead className="w-44">Grupos</TableHead>
              <TableHead className="w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {paged.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="py-2">
                  <UserSummary
                    avatarUrl={r.avatarUrl}
                    name={r.name}
                    subtitle={r.cargo ?? undefined}
                    fallback={r.email ?? undefined}
                  />
                </TableCell>

                <TableCell className="py-2 text-sm">
                  {r.unitName ?? "Matriz"}
                </TableCell>
                <TableCell className="py-2">
                  <span className="text-sm text-muted-foreground">
                    {new Date(r.addedAt).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell className="py-2">
                  <div>
                    {r.roleLabel ? (
                      <Badge variant="outline">{r.roleLabel}</Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  {r.groups && r.groups.length ? (
                    <UserGroupList
                      groups={r.groups}
                      userName={r.name ?? "Usuário"}
                      userTitle={r.cargo}
                    />
                  ) : null}
                </TableCell>
                <TableCell className="py-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setConfirmRow(r)}
                    disabled={removingId !== null}>
                    {removingId === r.id ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {paged.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-muted-foreground py-6">
                  Nenhum resultado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Mostrar</span>
          <select
            className="border rounded px-2 py-1 text-sm bg-white"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}>
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <span className="text-sm text-muted-foreground">
          Exibindo {paged.length ? start + 1 : 0}–
          {Math.min(start + pageSize, filtered.length)} de {localTotal}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}>
            <ArrowLeft />
          </Button>
          <span className="text-sm">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}>
            <ArrowRight />
          </Button>
        </div>
      </div>

      <AlertDialog
        open={Boolean(confirmRow)}
        onOpenChange={(open) => !open && setConfirmRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover usuário do grupo</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação remove o acesso desse usuário a todos os conteúdos do
              grupo. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingId !== null}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRow && handleRemove(confirmRow.id)}
              disabled={removingId !== null}>
              {removingId !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Remover"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
