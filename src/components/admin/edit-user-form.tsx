"use client";

import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { updateUser } from "@/lib/actions/user";
import type { Profile } from "@/lib/types";

// ✅ Admin só pode mudar o role
const formSchema = z.object({
  role: z.enum(["master", "user"]),
});

export function EditUserForm({ user }: { user: Profile }) {
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: (user.role as "master" | "user") || "user",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const fd = new FormData();
    fd.append("id", user.id);
    fd.append("role", values.role); // 👈 somente role

    const { error } = await updateUser(fd);
    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error,
      });
    } else {
      toast({
        title: "Perfil atualizado",
        description: "O papel do usuário foi alterado.",
      });
    }
  }

  return (
    <Card>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Somente leitura - não fazem parte do form/control */}
            <div>
              <FormLabel>Nome completo</FormLabel>
              <Input value={user.full_name ?? ""} disabled readOnly />
            </div>

            <div>
              <FormLabel>E-mail</FormLabel>
              <Input value={user.email ?? ""} disabled readOnly />
            </div>

            {/* Único campo editável */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="master">Master</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
