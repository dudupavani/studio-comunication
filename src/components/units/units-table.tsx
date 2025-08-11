"use client";

import Link from "next/link";
import type { Unit } from "@/lib/actions/units";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/shared/confirm-dialog";
import { deleteUnitAction } from "@/app/(app)/orgs/unit-actions";

type Props = {
  orgId: string;
  orgSlug: string;
  units: Unit[];
};

export default function UnitsTable({ orgId, orgSlug, units }: Props) {
  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Endereço</TableHead>
            <TableHead className="w-[180px]">CNPJ</TableHead>
            <TableHead className="w-[140px]">Telefone</TableHead>
            <TableHead className="w-[96px] text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {units.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/orgs/${orgSlug}/units/${u.slug}`}
                  className="hover:underline">
                  {u.name}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u.address ?? "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u.cnpj ?? "-"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {u.phone ?? "-"}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    aria-label="Editar unidade">
                    <Link href={`/orgs/${orgSlug}/units/${u.slug}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>

                  <ConfirmDialog
                    trigger={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir unidade">
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Excluir</span>
                      </Button>
                    }
                    title="Excluir unidade?"
                    description={`Esta ação removerá "${u.name}". Você tem certeza?`}
                    action={deleteUnitAction}
                    hidden={{ orgId, unitId: u.id }} // delete por ID continua OK
                    confirmText="Excluir"
                    danger
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {units.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-muted-foreground">
                Nenhuma unidade encontrada.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
