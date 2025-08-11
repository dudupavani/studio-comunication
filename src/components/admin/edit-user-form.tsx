"use client";

import * as React from "react";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { updateUser } from "@/lib/actions/user"; // <-- SINGULAR

type EditUserFormProps = {
  user: {
    id: string;
    full_name: string;
    email: string;
    role: string; // "user" | "master" | "admin"
  };
};

export function EditUserForm({ user }: EditUserFormProps) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [name, setName] = React.useState(user.full_name || "");
  const [role, setRole] = React.useState<string>(user.role || "user");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.set("id", user.id);
    form.set("name", name);
    form.set("role", role);

    startTransition(async () => {
      const res = await updateUser(form);
      if (res?.error) {
        toast({
          title: "Erro ao salvar",
          description: res.error,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Usuário atualizado", description: "Alterações salvas." });
    });
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Nome completo"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" value={user.email} disabled />
      </div>

      <div className="space-y-2">
        <Label>Função</Label>
        <Select value={role} onValueChange={(v) => setRole(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">user</SelectItem>
            <SelectItem value="master">master</SelectItem>
            <SelectItem value="admin">admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
