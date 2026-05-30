"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUnitDetailsAction } from "@/app/(app)/units/unit-actions";
import { useToast } from "@/hooks/use-toast";
import { useServerActionState } from "@/hooks/use-server-action-state";

const ESTADOS_BRASILEIROS = [
  { uf: "AC", nome: "Acre" },
  { uf: "AL", nome: "Alagoas" },
  { uf: "AP", nome: "Amapá" },
  { uf: "AM", nome: "Amazonas" },
  { uf: "BA", nome: "Bahia" },
  { uf: "CE", nome: "Ceará" },
  { uf: "DF", nome: "Distrito Federal" },
  { uf: "ES", nome: "Espírito Santo" },
  { uf: "GO", nome: "Goiás" },
  { uf: "MA", nome: "Maranhão" },
  { uf: "MT", nome: "Mato Grosso" },
  { uf: "MS", nome: "Mato Grosso do Sul" },
  { uf: "MG", nome: "Minas Gerais" },
  { uf: "PA", nome: "Pará" },
  { uf: "PB", nome: "Paraíba" },
  { uf: "PR", nome: "Paraná" },
  { uf: "PE", nome: "Pernambuco" },
  { uf: "PI", nome: "Piauí" },
  { uf: "RJ", nome: "Rio de Janeiro" },
  { uf: "RN", nome: "Rio Grande do Norte" },
  { uf: "RS", nome: "Rio Grande do Sul" },
  { uf: "RO", nome: "Rondônia" },
  { uf: "RR", nome: "Roraima" },
  { uf: "SC", nome: "Santa Catarina" },
  { uf: "SP", nome: "São Paulo" },
  { uf: "SE", nome: "Sergipe" },
  { uf: "TO", nome: "Tocantins" },
];

type Unit = {
  id: string;
  name: string;
  org_id: string;
  address?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  state?: string | null;
};

export default function UnitDetailsForm({ unit }: { unit: Unit }) {
  const { toast } = useToast();
  const [selectedState, setSelectedState] = React.useState<string>(unit.state ?? "");
  const [state, action] = useServerActionState(updateUnitDetailsAction, {
    ok: false,
    error: "",
  });

  React.useEffect(() => {
    if (state?.ok) {
      toast({ title: "Sucesso", description: "Dados atualizados com sucesso!" });
    } else {
      const errorMsg = (state as { error?: string }).error;
      if (errorMsg) {
        toast({ title: "Erro", description: errorMsg, variant: "destructive" });
      }
    }
  }, [state, toast]);

  return (
    <>
      <form action={action} className="space-y-4 max-w-2xl">
        <input type="hidden" name="orgId" value={unit.org_id} />
        <input type="hidden" name="unitId" value={unit.id} />
        <input type="hidden" name="state" value={selectedState} />

        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Nome *</label>
          <Input
            id="name"
            name="name"
            placeholder="Nome da unidade"
            defaultValue={unit.name}
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="address" className="text-sm font-medium">Endereço</label>
          <Input
            id="address"
            name="address"
            placeholder="Rua, número, bairro, cidade"
            defaultValue={unit.address ?? ""}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Estado</label>
          <Select value={selectedState} onValueChange={setSelectedState}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_BRASILEIROS.map((e) => (
                <SelectItem key={e.uf} value={e.uf}>
                  {e.uf} — {e.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="cnpj" className="text-sm font-medium">CNPJ</label>
            <Input
              id="cnpj"
              name="cnpj"
              placeholder="00.000.000/0000-00"
              defaultValue={unit.cnpj ?? ""}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">Telefone</label>
            <Input
              id="phone"
              name="phone"
              placeholder="(00) 00000-0000"
              defaultValue={unit.phone ?? ""}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </>
  );
}
