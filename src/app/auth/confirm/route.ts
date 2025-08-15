// src/app/auth/confirm/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, hash, origin } = new URL(request.url);
  const code = searchParams.get("code"); // PKCE
  const token_hash = searchParams.get("token_hash"); // OTP (Magic Link)
  let next = searchParams.get("next") || "/";

  // Se tiver hash com access_token, é um Magic Link
  const hasAccessToken = hash && hash.includes("access_token=");

  // Evita open-redirect
  if (!next.startsWith("/")) next = "/";

  // 👇 AQUI é o ponto crítico: cookies() precisa ser aguardado em Route Handlers
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          // usa set com value "" para respeitar path/domain informados pelo Supabase
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  let authError: any = null;

  // Se tiver hash com access_token, é um Magic Link bem-sucedido
  if (hasAccessToken) {
    // O token já foi processado pelo Supabase, só precisamos pegar o usuário
    const { data, error: getUserError } = await supabase.auth.getUser();

    if (getUserError || !data?.user) {
      console.error(
        "[/auth/confirm] Erro ao obter usuário após Magic Link:",
        getUserError
      );
      return NextResponse.redirect(`${origin}/login?message=auth_error`);
    }

    // Força definição de senha
    const { error: updateError } = await supabase.auth.updateUser({
      data: { must_set_password: true },
    });

    if (updateError) {
      console.error(
        "[/auth/confirm] Erro ao definir must_set_password:",
        updateError
      );
      return NextResponse.redirect(`${origin}/login?message=update_error`);
    }

    // Redireciona para definição de senha
    return NextResponse.redirect(`${origin}/auth/force-password`);
  }

  // Fluxo normal para outros tipos de confirmação (PKCE, etc)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error;
  } else if (token_hash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: "email",
    });
    authError = error;
  } else {
    authError = new Error("missing code, token_hash, or access_token");
  }

  if (authError) {
    console.warn("[/auth/confirm] auth error:", authError);
    return NextResponse.redirect(`${origin}/login?message=auth_error`);
  }

  // Marca primeiro acesso: força definir senha
  const { data, error: getUserError } = await supabase.auth.getUser();
  if (getUserError) {
    console.error(
      "[auth/confirm] Erro ao buscar usuário após autenticação:",
      getUserError
    );
    return NextResponse.redirect(`${origin}/login?message=auth_error`);
  }

  if (!data?.user) {
    console.warn("[auth/confirm] Nenhum usuário autenticado após Magic Link");
    return NextResponse.redirect(`${origin}/login?message=no_user`);
  }

  // Se o usuário não tem senha definida, força a definição
  const { error: updateError } = await supabase.auth.updateUser({
    data: { must_set_password: true },
  });

  if (updateError) {
    console.error(
      "[auth/confirm] Erro ao setar must_set_password:",
      updateError
    );
    return NextResponse.redirect(`${origin}/login?message=update_error`);
  }

  // Sempre redireciona para /auth/force-password após confirmação do Magic Link
  return NextResponse.redirect(`${origin}/auth/force-password`);
}
