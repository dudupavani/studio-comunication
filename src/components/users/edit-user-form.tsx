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
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { updateUserRoles } from "@/lib/actions/user";
import { getRoleLabel } from "@/lib/role-labels";

type Unit = { id: string; name: string };
type Team = { id: string; name: string };
type UnitRole = "unit_master" | "unit_user";
type OrgRole = "org_master" | "org_admin";
type TargetRole = OrgRole | UnitRole;

type Props = {
  userId: string;
  orgId: string;
  defaultName?: string | null;
  defaultEmail?: string | null;
  defaultPhone?: string | null;
  defaultCargo?: string | null;
  defaultEntryDate?: string | null;
  units: Unit[];
  teams: Team[];
  currentRole?: TargetRole | null;
  currentUnitId?: string | null;
  currentTeamId?: string | null;
};

export default function EditUserForm(props: Props) {
  const {
    userId,
    orgId,
    defaultName,
    defaultEmail,
    defaultPhone,
    defaultCargo,
    defaultEntryDate,
    units,
    teams,
    currentRole,
    currentUnitId,
    currentTeamId,
  } = props;
  const { toast } = useToast();

  // Função preferida: valor atual do membership (org ou unit role)
  const preferredRole: TargetRole | "" = currentRole ?? "";

  // Unidade inicial: 1ª unidade dos unit_roles (se houver)
  const initialUnitId: string = currentUnitId ?? "";
  const initialTeamId: string = currentTeamId ?? "";

  const [saving, setSaving] = useState(false);
  const [cargo, setCargo] = useState(defaultCargo ?? "");
  const [entryDate, setEntryDate] = useState(defaultEntryDate ?? "");
  const [targetRole, setTargetRole] = useState<TargetRole | "">(preferredRole);
  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialTeamId);

  const unitOptions = useMemo(() => units ?? [], [units]);
  const teamOptions = useMemo(() => teams ?? [], [teams]);
  const needsUnit = targetRole === "unit_master" || targetRole === "unit_user";

  useEffect(() => {
    setTargetRole(preferredRole);
  }, [preferredRole, userId]);

  useEffect(() => {
    setCargo(defaultCargo ?? "");
  }, [defaultCargo, userId]);

  useEffect(() => {
    setEntryDate(defaultEntryDate ?? "");
  }, [defaultEntryDate, userId]);

  useEffect(() => {
    setSelectedUnitId(
      initialUnitId || (unitOptions.length === 1 ? unitOptions[0].id : "")
    );
  }, [initialUnitId, unitOptions, userId]);

  useEffect(() => {
    setSelectedTeamId(
      initialTeamId || (teamOptions.length === 1 ? teamOptions[0].id : "")
    );
  }, [initialTeamId, teamOptions, userId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payloadUnitId = selectedUnitId || null;
    const payloadTeamId = selectedTeamId || null;

    if (!targetRole) {
      toast({ title: "Selecione uma função", variant: "destructive" });
      return;
    }
    if (!payloadUnitId && needsUnit) {
      toast({
        title: "Selecione a unidade do colaborador",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const employeeResponse = await fetch(`/api/users/${userId}/employee`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cargo: cargo.trim() ? cargo.trim() : null,
          dataEntrada: entryDate || null,
        }),
      });
      const employeePayload = await employeeResponse.json().catch(() => null);
      if (!employeeResponse.ok) {
        throw new Error(
          employeePayload?.error ?? "Falha ao salvar dados corporativos."
        );
      }

      const roleRes = await updateUserRoles({
        userId,
        orgId,
        targetRole: targetRole as OrgRole | UnitRole,
        unitId: needsUnit ? payloadUnitId : null,
        teamId: payloadTeamId,
      });

      if (!roleRes.ok) {
        throw new Error(roleRes.error ?? "Falha ao salvar dados de acesso.");
      }

      toast({
        title: "Colaborador atualizado",
        description: "Dados corporativos e permissões salvos com sucesso.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Falha ao salvar alterações.";
      toast({
        title: "Erro ao salvar",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      <section className="space-y-6">
        <div className="space-y-2">
          <h4>Dados pessoais</h4>
          <p className="text-sm text-muted-foreground">
            Informações básicas do colaborador
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={defaultName ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input value={defaultEmail ?? ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={defaultPhone ?? ""} disabled />
          </div>
        </div>
      </section>

      <Separator />

      <section className="space-y-6">
        <div className="space-y-2">
          <h4>Função e vínculos</h4>
          <p className="text-sm text-muted-foreground">
            Defina o nível de acesso do colaborador, sua unidade, e a equipe à
            qual ele pertence.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Função na plataforma</Label>
          <Select
            value={targetRole}
            onValueChange={(v) => {
              setTargetRole(v as TargetRole | "");
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="org_admin">
                {getRoleLabel("org_admin")}
              </SelectItem>
              <SelectItem value="org_master">
                {getRoleLabel("org_master")}
              </SelectItem>
              <SelectItem value="unit_master">
                {getRoleLabel("unit_master")}
              </SelectItem>
              <SelectItem value="unit_user">
                {getRoleLabel("unit_user")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cargo">Cargo</Label>
          <Input
            id="cargo"
            placeholder="Ex: Analista de Projetos"
            value={cargo}
            onChange={(event) => setCargo(event.target.value)}
          />
        </div>
        <div className="space-y-2 max-w-[180px]">
          <Label htmlFor="dataEntrada">Data de entrada</Label>
          <DatePicker
            value={entryDate || null}
            onChange={(value) => setEntryDate(value ?? "")}
          />
        </div>

        <div className="space-y-2">
          <Label>Unidade</Label>
          <Select
            value={selectedUnitId || UNIT_NONE_VALUE}
            onValueChange={(v) =>
              setSelectedUnitId(v === UNIT_NONE_VALUE ? "" : v)
            }>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a unidade ou Matriz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNIT_NONE_VALUE}>
                Matriz (sem unidade)
              </SelectItem>
              {unitOptions.length === 0
                ? null
                : unitOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Equipe</Label>
          <Select
            value={selectedTeamId || TEAM_NONE_VALUE}
            onValueChange={(v) =>
              setSelectedTeamId(v === TEAM_NONE_VALUE ? "" : v)
            }>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a equipe (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TEAM_NONE_VALUE}>Sem equipe</SelectItem>
              {teamOptions.length === 0
                ? null
                : teamOptions.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={saving} className="w-full sm:w-auto">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
const UNIT_NONE_VALUE = "__unit_none__";
const TEAM_NONE_VALUE = "__team_none__";
