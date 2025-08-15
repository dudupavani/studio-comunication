// src/app/auth/callback/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/";

  if (!next.startsWith("/")) next = "/";

  if (code) {
    const supabase = await createClient();

    // 🔄 troca o "code" por sessão (PKCE) e grava cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Marca a necessidade de definir senha no primeiro login (se ainda não marcado)
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && user.user_metadata?.must_set_password !== true) {
        await supabase.auth.updateUser({ data: { must_set_password: true } });
      }

      // redireciona para a próxima etapa (forçar senha)
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
