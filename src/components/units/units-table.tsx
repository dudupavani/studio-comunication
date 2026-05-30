"use client";

import { useState } from "react";
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
import { deleteUnitFormAction } from "@/app/(app)/units/unit-actions";
import UnitDetailModal from "@/components/units/unit-detail-modal";

type Props = {
  orgId: string;
  orgSlug: string;
  units: Unit[];
};

export default function UnitsTable({ orgId, orgSlug, units }: Props) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function openUnit(unit: Unit) {
    setSelectedUnit(unit);
    setModalOpen(true);
  }

  return (
    <>
      <div className="rounded-lg">
        <Table className="min-w-[600px] !overflow-x-auto border border-gray-200">
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[180px]">CNPJ</TableHead>
              <TableHead className="w-[140px]">Telefone</TableHead>
              <TableHead className="w-[96px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.map((u) => (
              <TableRow
                key={u.id}
                className="cursor-pointer"
                onClick={() => openUnit(u)}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell>{u.cnpj ?? "-"}</TableCell>
                <TableCell>{u.phone ?? "-"}</TableCell>
                <TableCell
                  className="text-right"
                  onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button
                      asChild
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Editar unidade ${u.name}`}>
                      <Link href={`/units/${u.slug}`}>
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>

                    <ConfirmDialog
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Excluir unidade ${u.name}`}>
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Excluir</span>
                        </Button>
                      }
                      title="Excluir unidade?"
                      description={`Esta ação removerá "${u.name}". Você tem certeza?`}
                      action={deleteUnitFormAction}
                      hidden={{ orgId, unitId: u.id }}
                      confirmText="Excluir"
                      danger
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <UnitDetailModal
        unit={selectedUnit}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
