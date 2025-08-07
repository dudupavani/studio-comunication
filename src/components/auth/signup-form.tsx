"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { signUp } from "@/lib/actions/auth";

const formSchema = z
  .object({
    name: z.string().min(1, { message: "Nome obrigatório" }),
    email: z.string().email({ message: "Insira um e-mail válido" }),
    password: z
      .string()
      .min(8, { message: "A senha deve ter pelo menos 8 caracteres" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export function SignUpForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("full_name", values.name);
    formData.append("email", values.email);
    formData.append("password", values.password);

    const { error, data } = await signUp(formData);

    // 1) Se houve erro de rede ou validação do Supabase:
    if (error) {
      return toast({
        variant: "destructive",
        title: "Error signing up",
        description: error,
      });
    }

    // 2) Se o Supabase nos retornou um objeto `data` e há um `user` dentro dele:
    //    usamos um type-guard ('user' in data) para garantir ao TS que
    //    podemos acessar data.user sem problema.
    if (data && "user" in data && data.user?.identities?.length === 0) {
      return toast({
        variant: "destructive",
        title: "Error signing up",
        description: "This email is already in use with another provider.",
      });
    }

    // 3) Caso tudo tenha dado certo:
    toast({
      title: "Check your email",
      description: "A confirmation link has been sent to your email address.",
    });

    if (onSuccess) {
      onSuccess();
    }
  }

  return (
    <div className="grid gap-4 py-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="email@exemplo.com" {...field} />
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Enviando inscrição..."
              : "Inscrever-se"}
          </Button>
        </form>
      </Form>
      <div className="mt-4 text-sm text-center">
        Already have an account?{" "}
        <Link href="/login" className="underline font-semibold">
          Login
        </Link>
      </div>
    </div>
  );
}
