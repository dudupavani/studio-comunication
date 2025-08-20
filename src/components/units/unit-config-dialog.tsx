"use client";

import FormDialog from "@/components/shared/form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateUnitDetailsAction } from "@/app/(app)/units/unit-actions";
import { Pencil } from "lucide-react";
import * as React from "react";

type Props = {
  orgId: string;
  unit: {
    id: string;
    name: string;
    address?: string | null;
    cnpj?: string | null;
    phone?: string | null;
  };
  /** Permite passar um trigger custom (ex.: ícone). Se não passar, usa botão outline padrão. */
  trigger?: React.ReactNode;
};

export default function UnitConfigDialog({ orgId, unit, trigger }: Props) {
  const triggerNode = trigger ?? (
    <Button variant="ghost" size="icon" aria-label="Editar unidade">
      <Pencil className="h-4 w-4" />
      <span className="sr-only">Editar</span>
    </Button>
  );

  return (
    <FormDialog
      trigger={triggerNode}
      title={`Configurar: ${unit.name}`}
      action={updateUnitDetailsAction}
      submitText="Salvar">
      <input type="hidden" name="orgId" value={orgId} />
      <input type="hidden" name="unitId" value={unit.id} />
      <Input name="name" placeholder="Nome" defaultValue={unit.name} />
      <Input
        name="address"
        placeholder="Endereço"
        defaultValue={unit.address ?? ""}
      />
      <Input name="cnpj" placeholder="CNPJ" defaultValue={unit.cnpj ?? ""} />
      <Input
        name="phone"
        placeholder="Telefone"
        defaultValue={unit.phone ?? ""}
      />
    </FormDialog>
  );
}
