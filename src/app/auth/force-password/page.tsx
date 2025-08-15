// src/app/auth/force-password/page.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { CircleCheckBig, KeySquare } from "lucide-react";
import { Input } from "@/components/ui/input";

export const dynamic = "force-dynamic";

export default async function ForcePasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[force-password] No user found, redirecting to login");
    redirect("/login");
  }

  // Verifica se o usuário realmente precisa definir a senha
  const needsPassword = user.user_metadata?.must_set_password === true;
  if (!needsPassword) {
    console.log(
      "[force-password] User doesn't need to set password, redirecting to dashboard"
    );
    redirect("/dashboard");
  }

  async function setPassword(formData: FormData) {
    "use server";
    const supa = await createClient();
    const password = String(formData.get("password") ?? "");

    if (!password || password.length < 8) {
      throw new Error("Senha deve ter pelo menos 8 caracteres.");
    }

    const { error } = await supa.auth.updateUser({ password });
    if (error) throw new Error(error.message);

    // ✅ libera o usuário do guard
    await supa.auth.updateUser({ data: { must_set_password: false } });

    redirect("/profile");
  }

  return (
    <div className="h-screen flex items-center justify-center">
      <form action={setPassword} className="mx-auto max-w-sm text-center px-4">
        <div className="w-full flex flex-col items-center justify-center gap-4">
          <div className="rounded-lg bg-gray-200 p-2">
            <KeySquare size={24} />
          </div>
          <h1 className="text-xl font-bold mb-8">Defina sua nova senha</h1>
        </div>
        <Input
          name="password"
          type="password"
          placeholder="Nova senha"
          className="w-full border rounded-md px-3 py-2 mb-4"
          required
        />
        <Button type="submit" className="w-full">
          <CircleCheckBig />
          Salvar e continuar
        </Button>
      </form>
    </div>
  );
}
