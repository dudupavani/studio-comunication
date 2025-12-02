// src/app/(app)/groups/[groupId]/MembersTable.tsx
"use client";

import { useMemo, useState } from "react";
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
import { ArrowLeft, ArrowRight } from "lucide-react";

type Row = {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  cargo: string | null;
  roleLabel: string | null;
  unitName: string | null;
  addedAt: string;
};

type Props = {
  rows: Row[];
  totalCount: number;
};

export default function MembersTable({ rows, totalCount }: Props) {
  // Busca e ordenação
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "unit" | "addedAt">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Paginação local (preparo para backend pagination no próximo passo)
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q
      ? rows.filter((r) => {
          const name = r.name ?? "";
          const email = r.email ?? "";
          const unit = r.unitName ?? "";
          return (
            name.toLowerCase().includes(q) ||
            email.toLowerCase().includes(q) ||
            unit.toLowerCase().includes(q)
          );
        })
      : rows;

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
  }, [rows, query, sortBy, sortDir]);

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
              <TableHead className="w-[160px] text-right">Função</TableHead>
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
                  <div className="flex justify-end">
                    {r.roleLabel ? (
                      <Badge variant="outline">{r.roleLabel}</Badge>
                    ) : null}
                  </div>
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
          {Math.min(start + pageSize, filtered.length)} de {totalCount}
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
    </div>
  );
}
