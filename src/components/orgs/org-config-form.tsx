// src/components/orgs/org-config-form.tsx
"use client";

import * as React from "react";
import { useState } from "react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const OrgSchema = z.object({
  name: z.string().min(2, "Informe o nome"),
  cnpj: z.string().min(14, "Informe um CNPJ válido"),
  address: z.string().min(3, "Informe o endereço"),
  phone: z.string().min(8, "Informe o telefone"),
  cep: z.string().min(8, "Informe o CEP"),
  cidade: z.string().min(2, "Informe a cidade"),
  estado: z.string().min(2, "Informe o estado"),
});

type OrgFormValues = z.infer<typeof OrgSchema>;

type Org = {
  id: string;
  name: string;
  cnpj: string;
  address: string;
  phone: string;
  cep: string;
  cidade: string;
  estado: string;
};

export default function OrgConfigForm({
  org,
  canEdit,
  onSubmit,
}: {
  org: Org;
  canEdit: boolean;
  onSubmit: (values: OrgFormValues) => Promise<{ ok: boolean; error?: string }>;
}) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const [values, setValues] = useState<OrgFormValues>({
    name: org.name ?? "",
    cnpj: org.cnpj ?? "",
    address: org.address ?? "",
    phone: org.phone ?? "",
    cep: org.cep ?? "",
    cidade: org.cidade ?? "",
    estado: org.estado ?? "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = OrgSchema.safeParse(values);
    if (!parsed.success) {
      const msg =
        parsed.error.errors[0]?.message ?? "Dados inválidos no formulário.";
      toast({
        title: "Erro ao validar",
        description: msg,
        variant: "destructive",
      });
      return;
    }
    try {
      setPending(true);
      const res = await onSubmit(parsed.data);
      if (res.ok) {
        toast({
          title: "Organização atualizada",
          description: "Dados salvos com sucesso.",
        });
      } else {
        toast({
          title: "Erro ao salvar",
          description: res.error ?? "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setPending(false);
    }
  }

  function handleChange(field: keyof OrgFormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 max-w-2xl">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={values.name}
          onChange={(e) => handleChange("name", e.target.value)}
          disabled={!canEdit || pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cnpj">CNPJ</Label>
        <Input
          id="cnpj"
          value={values.cnpj}
          onChange={(e) => handleChange("cnpj", e.target.value)}
          disabled={!canEdit || pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="address">Endereço</Label>
        <Input
          id="address"
          value={values.address}
          onChange={(e) => handleChange("address", e.target.value)}
          disabled={!canEdit || pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          value={values.phone}
          onChange={(e) => handleChange("phone", e.target.value)}
          disabled={!canEdit || pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cep">CEP</Label>
        <Input
          id="cep"
          value={values.cep}
          onChange={(e) => handleChange("cep", e.target.value)}
          disabled={!canEdit || pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="cidade">Cidade</Label>
        <Input
          id="cidade"
          value={values.cidade}
          onChange={(e) => handleChange("cidade", e.target.value)}
          disabled={!canEdit || pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="estado">Estado</Label>
        <Input
          id="estado"
          value={values.estado}
          onChange={(e) => handleChange("estado", e.target.value)}
          disabled={!canEdit || pending}
        />
      </div>

      <div>
        <Button type="submit" disabled={!canEdit || pending}>
          {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}
