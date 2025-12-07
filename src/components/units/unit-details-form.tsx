// src/components/units/unit-details-form.tsx
"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateUnitDetailsAction } from "@/app/(app)/units/unit-actions";
import { useToast } from "@/hooks/use-toast";
import { useServerActionState } from "@/hooks/use-server-action-state";

type Unit = {
  id: string;
  name: string;
  org_id: string;
  address?: string | null;
  cnpj?: string | null;
  phone?: string | null;
};

export default function UnitDetailsForm({ unit }: { unit: Unit }) {
  const { toast } = useToast();
  const [state, action] = useServerActionState(updateUnitDetailsAction, {
    ok: false,
    error: "",
  });

  // Show toast when state changes
  React.useEffect(() => {
    if (state?.ok) {
      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso!",
      });
    } else {
      const errorMsg = (state as { error?: string }).error;
      if (errorMsg) {
      toast({
        title: "Erro",
        description: errorMsg,
        variant: "destructive",
      });
      }
    }
  }, [state, toast]);

  return (
    <>
      <form
        // @ts-expect-error Server Action
        action={action}
        className="space-y-4 max-w-2xl">
      <input type="hidden" name="orgId" value={unit.org_id} />
      <input type="hidden" name="unitId" value={unit.id} />
      
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
          placeholder="Rua, número, bairro, cidade, UF, CEP" 
          defaultValue={unit.address ?? ""} 
        />
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
