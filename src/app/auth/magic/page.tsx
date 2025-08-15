"use client";

import { useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";

export default function MagicLinkPage() {
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function processHash() {
      try {
        // Pega o hash da URL
        const hash = window.location.hash.substring(1);
        if (!hash) {
          console.error("No hash found");
          router.push("/login?error=no_hash");
          return;
        }

        // Converte o hash em objeto
        const params = new URLSearchParams(hash);
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const expiresIn = params.get("expires_in");
        const tokenType = params.get("token_type");

        if (!accessToken || !refreshToken) {
          console.error("Missing tokens in hash");
          router.push("/login?error=invalid_hash");
          return;
        }

        // Define a sessão manualmente usando setSession
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Error setting session:", sessionError);
          router.push("/login?error=session_error");
          return;
        }

        // Obtém o usuário após definir a sessão
        const {
          data: { user },
          error: getUserError,
        } = await supabase.auth.getUser();

        if (getUserError || !user) {
          console.error("Error getting user:", getUserError);
          router.push("/login?error=user_error");
          return;
        }

        // Define must_set_password
        const { error: updateError } = await supabase.auth.updateUser({
          data: { must_set_password: true },
        });

        if (updateError) {
          console.error("Error updating user:", updateError);
          router.push("/login?error=update_error");
          return;
        }

        // Redireciona para definição de senha
        router.push("/auth/force-password");
      } catch (error) {
        console.error("Error processing magic link:", error);
        router.push("/login?error=unknown");
      }
    }

    processHash();
  }, [router, supabase.auth]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-4">Processando Magic Link</h1>
        <p>Por favor, aguarde...</p>
      </div>
    </div>
  );
}
