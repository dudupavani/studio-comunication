"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

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
import { useToast } from "@/hooks/use-toast";
import { signIn } from "@/lib/actions/auth";

const formSchema = z.object({
  email: z.string().email({ message: "Insira um e-mail válido." }),
  password: z.string().min(1, { message: "Senha obrigatória." }),
});

export function LoginForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("email", values.email);
    formData.append("password", values.password);

    const { error } = await signIn(formData);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error logging in",
        description: error,
      });
    }
  }

  return (
    <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[400px]">
      <div className="space-y-1 text-left">
        <h1 className="text-2xl font-semibold tracking-tight">
          Acesse sua conta
        </h1>
        <p className="text-sm text-muted-foreground">
          Utilize o seu e-mail corporativo
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="nome@exemplo.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center">
                  <FormLabel>Senha</FormLabel>
                  <Link
                    href="/forgot-password"
                    className="ml-auto text-xs font-medium text-muted-foreground hover:text-primary"
                    tabIndex={-1}>
                    Esqueceu a senha?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
