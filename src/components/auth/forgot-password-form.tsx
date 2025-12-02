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
import { sendPasswordResetEmail } from "@/lib/actions/auth";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

export function ForgotPasswordForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const formData = new FormData();
    formData.append("email", values.email);

    const { error } = await sendPasswordResetEmail(formData);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error,
      });
    } else {
      toast({
        title: "Check your email",
        description:
          "A password reset link has been sent to your email address.",
      });
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <CardHeader className="text-left">
        <CardTitle className="text-xl">Resgatar senha</CardTitle>
        <CardDescription>
          Insira seu e-mail para receber um link de redefinição de senha
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="nome@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Enviando..." : "Enviar"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
