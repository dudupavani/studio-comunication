"use client";

import * as React from "react";
import { useState, useMemo, useEffect } from "react";
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
import { getRoleLabel } from "@/lib/role-labels";

type Unit = { id: string; name: string };
type UnitRole = "unit_master" | "unit_user";
type OrgRole = "org_master" | "org_admin";
type TargetRole = OrgRole | UnitRole;

type Props = {
  userId: string;
  orgId: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
  units: Unit[];
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

  // Função inicial: dá prioridade ao papel de organização se existir
  const initialTargetRole: TargetRole | "" = (() => {
    if (currentOrgRole === "org_admin") return "org_admin";
    if (currentOrgRole === "org_master") return "org_master";
    if (currentUnitRoles && currentUnitRoles.length > 0) {
      return currentUnitRoles[0].role;
    }
    return "";
  })();

  // Unidade inicial: 1ª unidade dos unit_roles (se houver)
  const initialUnitId: string =
    currentUnitRoles && currentUnitRoles.length > 0
      ? currentUnitRoles[0].unitId
      : "";

  const [saving, setSaving] = useState(false);
  const [targetRole, setTargetRole] = useState<TargetRole | "">(
    initialTargetRole
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);

  const unitOptions = useMemo(() => units ?? [], [units]);
  const needsUnit = targetRole === "unit_master" || targetRole === "unit_user";

  // Ao trocar para role de UNIDADE e não houver unidade escolhida:
  // - Se houver apenas 1 unidade disponível, seleciona automaticamente
  // - Senão, limpa para forçar a escolha
  useEffect(() => {
    if (needsUnit) {
      if (!selectedUnitId) {
        if (unitOptions.length === 1) {
          setSelectedUnitId(unitOptions[0].id);
        } else {
          setSelectedUnitId("");
        }
      }
    } else {
      // Ao trocar para role de ORG, limpar unidade
      if (selectedUnitId) setSelectedUnitId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole]);

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
      // agora suporta org_admin também
      targetRole: targetRole as OrgRole | UnitRole,
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

      {/* Função */}
      <div className="space-y-2">
        <Label>Função</Label>
        <Select
          value={targetRole}
          onValueChange={(v) => {
            setTargetRole(v as TargetRole | "");
            // Se mudar para role de organização, limpa unidade
            if (v !== "unit_master" && v !== "unit_user") {
              setSelectedUnitId("");
            }
          }}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a função" />
          </SelectTrigger>
          <SelectContent>
            {/* Roles de organização */}
            <SelectItem value="org_admin">
              {getRoleLabel("org_admin")}
            </SelectItem>
            <SelectItem value="org_master">
              {getRoleLabel("org_master")}
            </SelectItem>
            {/* Roles de unidade */}
            <SelectItem value="unit_master">
              {getRoleLabel("unit_master")}
            </SelectItem>
            <SelectItem value="unit_user">
              {getRoleLabel("unit_user")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Unidade (só para unit_* ) */}
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
