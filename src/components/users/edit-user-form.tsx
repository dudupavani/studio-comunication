"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updateUserRoles } from "@/lib/actions/user";

// Tipos básicos (ajuste conforme seus tipos)
type Unit = { id: string; name: string };
type UnitRole = "unit_master" | "unit_user";
type OrgRole = "org_master" | "org_admin";
type TargetRole = OrgRole | UnitRole;

type Props = {
  userId: string;
  orgId: string;
  // Campos existentes
  defaultName?: string | null;
  defaultEmail?: string | null;
  // Novos dados para o select de unidades
  units: Unit[]; // injete a lista de unidades da org no server component pai e passe aqui
  // Valores atuais (se quiser preencher)
  currentOrgRole?: OrgRole | null;
  currentUnitRoles?: { unitId: string; role: UnitRole }[];
};

export default function EditUserForm(props: Props) {
  const {
    userId,
    orgId,
    defaultName,
    defaultEmail,
    units,
    currentOrgRole,
    currentUnitRoles,
  } = props;
  const { toast } = useToast();

  // Determine initial target role based on current roles
  const initialTargetRole = (() => {
    if (currentOrgRole === "org_master") return "org_master";
    if (currentUnitRoles && currentUnitRoles.length > 0)
      return currentUnitRoles[0].role;
    return "";
  })();

  const initialUnitId =
    currentUnitRoles && currentUnitRoles.length > 0
      ? currentUnitRoles[0].unitId
      : "";

  const [saving, setSaving] = useState(false);
  const [targetRole, setTargetRole] = useState<TargetRole | "">(
    initialTargetRole
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);

  const needsUnit = targetRole === "unit_master" || targetRole === "unit_user";

  const unitOptions = useMemo(() => units ?? [], [units]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetRole) {
      toast({ title: "Selecione uma função", variant: "destructive" });
      return;
    }
    if (needsUnit && !selectedUnitId) {
      toast({ title: "Selecione a unidade", variant: "destructive" });
      return;
    }

    setSaving(true);
    const res = await updateUserRoles({
      userId,
      orgId,
      targetRole: targetRole as "org_master" | "unit_master" | "unit_user",
      unitId: needsUnit ? selectedUnitId : null,
    });
    setSaving(false);

    if (!res.ok) {
      toast({
        title: "Erro ao salvar",
        description: res.error ?? "Falha inesperada.",
        variant: "destructive",
      });
      return;
    }
    toast({ title: "Função atualizada com sucesso" });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-6">
      {/* Nome */}
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input value={defaultName ?? ""} disabled />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label>E-mail</Label>
        <Input value={defaultEmail ?? ""} disabled />
      </div>

      {/* Função (org/unit) */}
      <div className="space-y-2">
        <Label>Função</Label>
        <Select
          value={targetRole}
          onValueChange={(v) => {
            setTargetRole(v as TargetRole | "");
            // Reset unit selection when changing role type
            if (v !== "unit_master" && v !== "unit_user") {
              setSelectedUnitId("");
            }
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="org_master">Org Master</SelectItem>
            <SelectItem value="unit_master">Unid. Master</SelectItem>
            <SelectItem value="unit_user">Unid. User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Unidade (aparece somente para unit_* ) */}
      {needsUnit && (
        <div className="space-y-2">
          <Label>Unidade</Label>
          <Select
            value={selectedUnitId}
            onValueChange={(v) => setSelectedUnitId(v)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
